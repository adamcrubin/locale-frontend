import { Router } from 'express';
import { getWeather } from '../services/weather.js';
import { generatePromptResponse, generateWeekdayPromptResponse, generateAskResponse } from '../services/claude.js';
import { getAuthUrl, handleCallback, isConnected, disconnect, getUpcomingEvents, addCalendarEvent } from '../services/google.js';
import { refreshWeather, refreshActivities, refreshSources, runMonthlyHealthCheck } from '../jobs/refresh.js';
import { getPhotosForCategory, getAmbientPhotos } from '../services/unsplash.js';
import { query } from '../services/db.js';
import { validateAllSources } from '../services/urlValidator.js';
import { runExtractionPass, extractEventsFromSource } from '../services/extractor.js';
import { runVerificationPass } from '../services/verification.js';
import { getEventFeed, recordFeedback, markEventsShown, markRecsShown } from '../services/relevancy.js';
import * as cache from '../services/cache.js';

const router = Router();

// ── Auth debug endpoint — safe diagnostics without exposing secrets ───────────
router.get('/auth/debug', async (req, res) => {
  const checks = {
    supabase_url:         !!process.env.SUPABASE_URL,
    supabase_service_key: !!process.env.SUPABASE_SERVICE_KEY,
    google_client_id:     !!process.env.GOOGLE_CLIENT_ID,
    google_client_secret: !!process.env.GOOGLE_CLIENT_SECRET,
    google_redirect_uri:  process.env.GOOGLE_REDIRECT_URI || '(not set)',
    anthropic_key:        !!process.env.ANTHROPIC_API_KEY,
  };

  let supabaseConnected = false;
  let tokenCount = 0;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await sb.from('google_tokens').select('id', { count: 'exact' }).limit(1);
    supabaseConnected = !error;
    tokenCount = data?.length ?? 0;
  } catch (e) {
    checks.supabase_error = e.message;
  }

  res.json({
    ok: true,
    env_checks: checks,
    supabase_connected: supabaseConnected,
    google_tokens_in_db: tokenCount,
    hint: !checks.supabase_service_key
      ? 'SUPABASE_SERVICE_KEY is missing — Calendar token storage will silently fail'
      : !supabaseConnected
      ? 'Supabase connection failed — check SUPABASE_URL and SUPABASE_SERVICE_KEY values'
      : 'All systems look good',
  });
});

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status:'ok', uptime:process.uptime(), cache:cache.keys().length + ' keys' });
});

// ── Weather ───────────────────────────────────────────────────────────────────
router.get('/weather', async (req, res) => {
  const city = req.query.city || 'Falls Church, VA';
  try {
    const data = await getWeather(city);
    res.json({ ok:true, data });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── Events feed (new v2) ──────────────────────────────────────────────────────
// Returns scored events + pinned recommendation per category
router.get('/events', async (req, res) => {
  const zip       = req.query.zip       || '22046';
  const profileId = req.query.profileId || 'default';
  const category  = req.query.category  || null;
  const weekday   = req.query.weekday   === 'true';
  const limit     = parseInt(req.query.limit  || '100');
  const offset    = parseInt(req.query.offset || '0');

  try {
    const city        = req.query.city || 'Falls Church, VA';
    const weatherData = await getWeather(city).catch(() => null);
    const weather     = weatherData?.days || [];

    const feed = await getEventFeed(zip, profileId, weather, {
      categories: category ? [category] : null,
      weekday, limit, offset,
    });

    res.json({ ok:true, data:feed, zip, profileId });
  } catch (e) {
    console.error('[api] /events error:', e.message);
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── Mark events as shown ──────────────────────────────────────────────────────
router.post('/events/shown', async (req, res) => {
  const { profileId, eventIds, recIds, zipCode = '22046' } = req.body;
  try {
    await markEventsShown(profileId, eventIds, zipCode);
    await markRecsShown(profileId, recIds, zipCode);
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── Feedback ──────────────────────────────────────────────────────────────────
router.post('/events/feedback', async (req, res) => {
  const { profileId, itemId, itemType, zipCode = '22046', feedback } = req.body;
  // itemType: 'event' | 'recommendation'
  // feedback: 'up' | 'down' | 'dismissed' | 'saved'
  try {
    await recordFeedback(itemType || 'event', profileId, itemId, zipCode, feedback);
    res.json({ ok:true });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── AI Prompts (Sonnet — quality matters here) ────────────────────────────────
// ── Free-text Ask Claude endpoint ─────────────────────────────────────────────
// Used by the AskClaude chat component in ActiveMode for arbitrary questions.
// Unlike /prompts/:label which maps to preset itineraries, this takes any
// free-text question and returns a conversational answer.
router.post('/ask', async (req, res) => {
  const { question, city = 'Falls Church, VA', profile = null } = req.body;
  if (!question?.trim()) return res.status(400).json({ ok:false, error:'question required' });
  try {
    const data = await generateAskResponse(question, city, profile);
    res.json({ ok:true, data });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

router.get('/prompts/:label', async (req, res) => {
  const label   = decodeURIComponent(req.params.label);
  const city    = req.query.city    || 'Falls Church, VA';
  const profile = req.query.profile ? JSON.parse(decodeURIComponent(req.query.profile)) : null;
  try {
    const data = await generatePromptResponse(label, city, profile);
    res.json({ ok:true, data });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

router.get('/weekday-prompts/:label', async (req, res) => {
  const label   = decodeURIComponent(req.params.label);
  const city    = req.query.city    || 'Falls Church, VA';
  const profile = req.query.profile ? JSON.parse(decodeURIComponent(req.query.profile)) : null;
  try {
    const data = await generateWeekdayPromptResponse(label, city, profile);
    res.json({ ok:true, data });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── Photos ────────────────────────────────────────────────────────────────────
router.get('/photos/ambient', async (req, res) => {
  const city = req.query.city || 'Falls Church, VA';
  try {
    const photos = await getAmbientPhotos(city);
    res.json({ ok:true, photos });
  } catch (e) {
    res.json({ ok:true, photos:[] });
  }
});

router.get('/photos/category/:category', async (req, res) => {
  const { category } = req.params;
  const city  = req.query.city  || 'Falls Church, VA';
  const count = parseInt(req.query.count || '6');
  try {
    const photos = await getPhotosForCategory(category, city, count);
    res.json({ ok:true, photos });
  } catch (e) {
    res.json({ ok:true, photos:[] });
  }
});

// ── Google Calendar ───────────────────────────────────────────────────────────
router.get('/auth/google', (req, res) => {
  const userId    = req.query.userId    || 'anonymous';
  const profileId = req.query.profileId || 'default';
  const url = getAuthUrl(userId, profileId);
  // Redirect directly — this opens in a popup window
  res.redirect(url);
});

router.get('/auth/google/callback', async (req, res) => {
  try {
    const { email, userId, profileId } = await handleCallback(req.query.code, req.query.state);
    // Close the popup and signal success to the parent window
    res.send(`
      <html><body>
        <script>
          window.opener?.postMessage({ type:'gcal_connected', email:'${email}', profileId:'${profileId}' }, '*');
          window.close();
        </script>
        <p>Connected! You can close this window.</p>
      </body></html>
    `);
  } catch (e) {
    res.send(`<html><body><script>window.close();</script><p>Error: ${e.message}</p></body></html>`);
  }
});

router.get('/auth/google/status', async (req, res) => {
  const { userId, profileId = 'default' } = req.query;
  if (!userId) return res.json({ ok:true, connected:false });
  if (!process.env.SUPABASE_SERVICE_KEY) return res.json({ ok:true, connected:false, debug:'SUPABASE_SERVICE_KEY not set' });
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data, error } = await sb.from('google_tokens').select('email').eq('user_id', userId).eq('profile_id', profileId).single();
    if (error) return res.json({ ok:true, connected:false, debug:error.message });
    res.json({ ok:true, connected:!!data, email:data?.email });
  } catch (e) { res.json({ ok:true, connected:false, debug:e.message }); }
});

router.post('/auth/google/disconnect', async (req, res) => {
  const { userId, profileId = 'default' } = req.body;
  if (!userId) return res.json({ ok: true });
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    await sb.from('google_tokens').delete().eq('user_id', userId).eq('profile_id', profileId);
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true }); // non-fatal
  }
});

router.get('/calendar/events', async (req, res) => {
  const { userId, profileId = 'default' } = req.query;
  try {
    const events = await getUpcomingEvents(userId, profileId);
    res.json({ ok:true, events });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

router.post('/calendar/add', async (req, res) => {
  const { userId, profileId = 'default', ...activity } = req.body;
  try {
    const event = await addCalendarEvent(userId, profileId, activity);
    res.json({ ok:true, event });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── Sources management ────────────────────────────────────────────────────────
router.get('/sources', async (req, res) => {
  const zip = req.query.zip || '22046';
  try {
    const { rows } = await query(
      `SELECT id,name,url,type,category_hint,active,last_ok,last_error FROM sources WHERE zip_code=$1 ORDER BY active DESC,name ASC`,
      [zip]
    );
    res.json({ ok:true, sources:rows });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── Recommendations management ────────────────────────────────────────────────
router.get('/recommendations', async (req, res) => {
  const zip = req.query.zip || '22046';
  try {
    const { rows } = await query(
      `SELECT * FROM recommendations WHERE zip_code=$1 ORDER BY type,weight DESC`,
      [zip]
    );
    res.json({ ok:true, recommendations:rows });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

router.patch('/recommendations/:id', async (req, res) => {
  const { weight, active, verified_status } = req.body;
  try {
    const { rows } = await query(
      `UPDATE recommendations SET
         weight = COALESCE($1, weight),
         active = COALESCE($2, active),
         verified_status = COALESCE($3, verified_status),
         updated_at = NOW()
       WHERE id=$4 RETURNING *`,
      [weight, active, verified_status, req.params.id]
    );
    res.json({ ok:true, recommendation:rows[0] });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

// ── Admin ─────────────────────────────────────────────────────────────────────
router.post('/admin/refresh/weather', async (req, res) => {
  const city = req.body.city || 'Falls Church, VA';
  await refreshWeather(city);
  res.json({ ok:true, message:`Weather refreshed for ${city}` });
});

router.post('/admin/refresh/activities', async (req, res) => {
  const { zip='22046', force=false } = req.body;
  refreshActivities(zip, force);
  res.json({ ok:true, message:`Refresh started for zip ${zip}` });
});

router.post('/admin/refresh/sources', async (req, res) => {
  const zip = req.body.zip || '22046';
  refreshSources(zip);
  res.json({ ok:true, message:`Scraping started for zip ${zip}` });
});

router.post('/admin/extract', async (req, res) => {
  const zip = req.body.zip || '22046';
  runExtractionPass(zip);
  res.json({ ok:true, message:`Extraction started for zip ${zip}` });
});

// ── Synchronous debug extraction — runs on ONE source and returns full result ─
// Use this to diagnose why extraction isn't producing events.
// Returns: the raw text sent to Haiku, Haiku's raw response, and any DB errors.
router.post('/admin/extract/debug', async (req, res) => {
  const zip = req.body.zip || '22046';
  try {
    // Get the single most recently scraped source with content
    const { rows } = await query(
      `SELECT DISTINCT ON (sc.source_id)
         sc.source_id, sc.raw_text, sc.scraped_at, s.name,
         length(sc.raw_text) as char_count
       FROM scraped_content sc
       JOIN sources s ON s.id = sc.source_id
       WHERE s.zip_code = $1
         AND sc.success = true
         AND sc.expires_at > NOW()
         AND sc.raw_text IS NOT NULL
         AND length(sc.raw_text) > 100
       ORDER BY sc.source_id, sc.scraped_at DESC
       LIMIT 1`,
      [zip]
    );

    if (!rows.length) {
      return res.json({ ok:false, error:'No scraped content found with raw_text. Check that scraper wrote text correctly.' });
    }

    const source = rows[0];

    // Run extraction synchronously and return full result
    const result = await extractEventsFromSource(
      source.source_id, source.name, source.raw_text, zip
    );

    res.json({
      ok: true,
      source: source.name,
      char_count: source.char_count,
      text_preview: source.raw_text.slice(0, 300),
      extraction_result: result,
    });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message, stack:e.stack?.slice(0,500) });
  }
});

router.post('/admin/verify', async (req, res) => {
  const { zip='22046', force=false } = req.body;
  runVerificationPass(zip, force);
  res.json({ ok:true, message:`Verification started` });
});

router.post('/admin/validate-urls', async (req, res) => {
  const zip = req.body.zip || '22046';
  validateAllSources(zip);
  res.json({ ok:true, message:`URL validation started for zip ${zip}` });
});

router.post('/admin/health-check', async (req, res) => {
  const zip = req.body.zip || '22046';
  runMonthlyHealthCheck(zip);
  res.json({ ok:true, message:`Health check started for zip ${zip}` });
});

router.get('/admin/cache', (req, res) => {
  res.json({ keys:cache.keys() });
});

router.post('/admin/cache/clear', (req, res) => {
  cache.flush();
  res.json({ ok:true, message:'Cache cleared' });
});

// Wipe all events from the DB so the pipeline can re-extract cleanly.
// Use when extraction rules have changed (blocklist, prompt, dedup) and
// existing events need to be purged. Also clears scraped_content so the
// next pipeline run pulls fresh HTML.
router.post('/admin/clear-events', async (req, res) => {
  try {
    const eventsResult = await query('DELETE FROM events RETURNING id');
    const scrapedResult = await query('DELETE FROM scraped_content RETURNING id');
    cache.flush();
    res.json({
      ok: true,
      eventsDeleted: eventsResult.rowCount || 0,
      scrapedDeleted: scrapedResult.rowCount || 0,
      message: 'All events and scraped content cleared. Run /admin/refresh/sources then /admin/extract to rebuild.'
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Admin: events debug ───────────────────────────────────────────────────────
router.get('/admin/events', async (req, res) => {
  const zip   = req.query.zip   || '22046';
  const limit = parseInt(req.query.limit || '50');
  try {
    const { rows } = await query(
      `SELECT id,title,venue,start_date,when_display,cost_display,categories,confidence,base_score,source_name,active
       FROM events WHERE zip_code=$1 ORDER BY base_score DESC, start_date ASC LIMIT $2`,
      [zip, limit]
    );
    res.json({ ok:true, events:rows, count:rows.length });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

router.get('/admin/scraped', async (req, res) => {
  const zip = req.query.zip || '22046';
  try {
    const { rows } = await query(
      `SELECT s.name, length(sc.raw_text) as char_count, sc.scraped_at, sc.success,
              left(sc.raw_text, 120) as preview
       FROM scraped_content sc
       JOIN sources s ON s.id=sc.source_id
       WHERE s.zip_code=$1 AND sc.expires_at > NOW()
       ORDER BY sc.scraped_at DESC`,
      [zip]
    );
    res.json({ ok:true, scraped:rows });
  } catch (e) {
    res.status(500).json({ ok:false, error:e.message });
  }
});

export default router;
