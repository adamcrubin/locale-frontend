import { useState, useEffect, useRef } from 'react';
import AmbientMode          from './components/AmbientMode';
import ActiveMode           from './components/ActiveMode';
import WeekdayMode          from './components/WeekdayMode';
import WeatherScreen        from './components/WeatherScreen';
import CalendarModal        from './components/CalendarModal';
import SettingsScreen       from './components/SettingsScreen';
import ProfilePicker        from './components/ProfilePicker';
import SavedPage            from './components/SavedPage';
import OnboardingFlow       from './components/OnboardingFlow';
import PostEventFeedback    from './components/PostEventFeedback';
import { useSettings }      from './hooks/useSettings';
import { useActivities }    from './hooks/useActivities';
import { useWeekdayActivities } from './hooks/useWeekdayActivities';
import { useWeather }       from './hooks/useWeather';
import { usePhotos }        from './hooks/usePhotos';
import { usePostEventFeedback, trackForFeedback } from './hooks/usePostEventFeedback';
import { postFeedback }     from './lib/api';

// ── Loading splash ────────────────────────────────────────────────────────────
function LoadingSplash() {
  return (
    <div style={{
      width:'100vw', height:'100vh', background:'#0f0d0b',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:14,
    }}>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:32, color:'rgba(255,255,255,.25)', fontWeight:300, letterSpacing:'.06em' }}>
        Locale
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background:'rgba(201,168,76,.4)',
            animation:`blink 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Reactive isMobile hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

// ── Full Debug Panel ──────────────────────────────────────────────────────────
// Always visible in this build. Shows data sources, errors, and lets you
// fire raw API requests and copy the responses to paste back to Claude.
function DebugPanel({ activitiesSource, weatherSource, settings, activeProfile }) {
  const [open,    setOpen]    = useState(false);
  const [tab,     setTab]     = useState('status');   // 'status' | 'inspect' | 'pipeline' | 'env'
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [copied,  setCopied]  = useState(null);

  const BASE      = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
  const city      = settings?.city || 'Falls Church, VA';
  const profileId = activeProfile?.id || 'default';
  const zip       = city.match(/\b(\d{5})\b/)?.[1] || '22046';

  const allLive = activitiesSource === 'live' && weatherSource === 'live';
  const allMock = activitiesSource === 'mock' && weatherSource === 'mock';
  const dot     = allLive ? '#22c55e' : allMock ? '#f59e0b' : '#60a5fa';
  const label   = allLive ? 'LIVE' : allMock ? 'DEMO' : 'PARTIAL';

  // ── Fire any request (GET or POST) ───────────────────────────────────────
  const fire = async (key, path, method = 'GET', body = null) => {
    setLoading(l => ({ ...l, [key]: true }));
    const start = Date.now();
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const res  = await fetch(`${BASE}${path}`, opts);
      const data = await res.json();
      setResults(r => ({ ...r, [key]: { ok: res.ok, status: res.status, ms: Date.now() - start, data, method } }));
    } catch (e) {
      setResults(r => ({ ...r, [key]: { ok: false, status: 0, ms: Date.now() - start, error: e.message, method } }));
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  };

  const copy = (key) => {
    navigator.clipboard.writeText(JSON.stringify(results[key], null, 2)).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Inspect checks (GET) ─────────────────────────────────────────────────
  const INSPECT = [
    { key: 'health',      label: '🟢 Health',       path: '/health' },
    { key: 'weather',     label: '🌤 Weather',       path: `/weather?city=${encodeURIComponent(city)}` },
    { key: 'events',      label: '📋 Events feed',   path: `/events?zip=${zip}&profileId=${profileId}&city=${encodeURIComponent(city)}` },
    { key: 'sources',     label: '🗂 Sources',       path: `/sources?zip=${zip}` },
    { key: 'scraped',     label: '🕷 Scraped content',path: `/admin/scraped?zip=${zip}` },
    { key: 'dbevents',    label: '📌 DB events',     path: `/admin/events?zip=${zip}&limit=20` },
    { key: 'cache',       label: '⚡ Cache keys',    path: '/admin/cache' },
  ];

  // ── Pipeline actions (POST) ──────────────────────────────────────────────
  const PIPELINE = [
    {
      key:   'run_scrape',
      label: '🕷 1. Run scrape',
      desc:  'Fetches HTML from all active sources for your zip. Takes 15–30s.',
      path:  '/admin/refresh/sources',
      method:'POST',
      body:  { zip },
      color: '#60a5fa',
    },
    {
      key:   'run_extract',
      label: '🤖 2. Run extraction',
      desc:  'Sends scraped content to Haiku to extract structured events. Takes 20–60s.',
      path:  '/admin/extract',
      method:'POST',
      body:  { zip },
      color: '#a78bfa',
    },
    {
      key:   'run_full',
      label: '🚀 Full pipeline (scrape + extract)',
      desc:  'Runs both steps end-to-end. Takes 45–90s. Use this to get first live events.',
      path:  '/admin/refresh/activities',
      method:'POST',
      body:  { zip },
      color: '#34d399',
    },
    {
      key:   'clear_cache',
      label: '🗑 Clear cache',
      desc:  'Flushes in-memory cache so next page load fetches fresh data.',
      path:  '/admin/cache/clear',
      method:'POST',
      body:  {},
      color: '#f59e0b',
    },
    {
      key:   'verify_urls',
      label: '🔍 Verify source URLs',
      desc:  'Checks all source URLs are reachable. Marks broken ones inactive.',
      path:  '/admin/validate-urls',
      method:'POST',
      body:  { zip },
      color: '#94a3b8',
    },
  ];

  // ── Styles ───────────────────────────────────────────────────────────────
  const s = {
    panel: {
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      fontFamily: 'DM Sans, sans-serif',
      maxHeight: open ? '75vh' : 'auto',
      display: 'flex', flexDirection: 'column',
    },
    bar: {
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'rgba(8,8,8,.96)', borderTop: `2px solid ${dot}`,
      padding: '7px 14px', cursor: 'pointer', backdropFilter: 'blur(12px)',
      userSelect: 'none',
    },
    body: {
      background: '#0a0a0a', overflowY: 'auto', flex: 1,
      borderTop: '0.5px solid rgba(255,255,255,.08)',
    },
    tabs: {
      display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,.08)',
      background: '#080808',
    },
    tab: (active) => ({
      fontSize: 11, padding: '8px 14px', cursor: 'pointer', border: 'none',
      background: 'transparent', fontFamily: 'DM Sans, sans-serif',
      color: active ? '#fff' : 'rgba(255,255,255,.35)',
      borderBottom: active ? '2px solid #C9A84C' : '2px solid transparent',
      fontWeight: active ? 600 : 400, transition: 'all .12s',
    }),
    section: { padding: '12px 14px' },
    h: { fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)', marginBottom: 10 },
    btn: (color = '#ffffff') => ({
      fontSize: 11, padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
      border: `0.5px solid ${color}44`, background: `${color}18`,
      color: color, fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
      transition: 'all .12s',
    }),
    row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
    pre: (ok) => ({
      fontSize: 11, color: ok ? 'rgba(255,255,255,.6)' : '#f87171',
      background: 'rgba(255,255,255,.03)', border: '0.5px solid rgba(255,255,255,.07)',
      borderRadius: 6, padding: '8px 10px', overflowX: 'auto',
      maxHeight: 180, margin: '6px 0 0', whiteSpace: 'pre-wrap',
      wordBreak: 'break-all', fontFamily: 'monospace',
    }),
  };

  // ── Result row renderer (shared by both tabs) ────────────────────────────
  const ResultRow = ({ k }) => {
    const res = results[k];
    if (!res) return null;
    const ok = res.ok;
    const c  = ok ? '#22c55e' : '#f87171';
    const preview = JSON.stringify(res.error || res.data, null, 2);
    return (
      <div>
        <div style={s.row}>
          <span style={{ fontSize: 11, color: c, fontWeight: 600 }}>
            {ok ? '✓' : '✗'} {res.status} · {res.ms}ms
          </span>
          <button
            style={{
              fontSize: 11, padding: '6px 12px', borderRadius: 7, cursor: 'pointer',
              border: copied===k ? '0.5px solid #22c55e44' : '0.5px solid #ffffff44',
              background: copied===k ? '#22c55e18' : '#ffffff18',
              color: copied===k ? '#22c55e' : 'rgba(255,255,255,.6)',
              fontFamily: 'DM Sans, sans-serif', flexShrink: 0, marginLeft: 'auto',
            }}
            onClick={() => copy(k)}>
            {copied === k ? '✓ Copied' : '📋 Copy'}
          </button>
        </div>
        <pre style={s.pre(ok)}>
          {preview.slice(0, 1200)}{preview.length > 1200 ? '\n\n… truncated — hit Copy for full response' : ''}
        </pre>
      </div>
    );
  };

  return (
    <div style={s.panel}>
      {/* ── Status bar ── */}
      <div style={s.bar} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 8px ${dot}` }} />
        <span style={{ fontSize: 11, color: dot, fontWeight: 700, letterSpacing: '.05em' }}>{label}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', flex: 1 }}>
          {allMock ? ' Backend not reached — open to diagnose' : ` ${BASE}`}
        </span>
        {!open && activitiesSource === 'mock' && (
          <span style={{ fontSize: 10, background: '#f59e0b22', color: '#f59e0b', border: '0.5px solid #f59e0b44', borderRadius: 4, padding: '2px 7px' }}>
            showing mock data
          </span>
        )}
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,.3)', marginLeft: 4 }}>{open ? '▼' : '▲'}</span>
      </div>

      {open && (
        <div style={s.body}>
          {/* ── Tabs ── */}
          <div style={s.tabs}>
            {[['status','📊 Status'],['inspect','🔍 Inspect'],['pipeline','🚀 Pipeline'],['env','⚙ Env']].map(([id, lbl]) => (
              <button key={id} style={s.tab(tab===id)} onClick={() => setTab(id)}>{lbl}</button>
            ))}
          </div>

          {/* ── Status tab ── */}
          {tab === 'status' && (
            <div style={s.section}>
              <div style={s.h}>Data sources</div>
              {[{ label: 'Activities', src: activitiesSource }, { label: 'Weather', src: weatherSource }].map(({ label, src }) => {
                const c = src==='live' ? '#22c55e' : src==='mock' ? '#f59e0b' : '#94a3b8';
                const msg = src==='live' ? 'Live from backend ✓' : src==='mock' ? 'Mock — backend not reached' : src;
                return (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:c, boxShadow:`0 0 6px ${c}88`, flexShrink:0 }} />
                    <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', width:80 }}>{label}</span>
                    <span style={{ fontSize:13, color:c, fontWeight:600 }}>{msg}</span>
                  </div>
                );
              })}
              <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(255,255,255,.03)', borderRadius:8, border:'0.5px solid rgba(255,255,255,.07)' }}>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.25)', lineHeight:1.8 }}>
                  <div>API: <span style={{color:'rgba(255,255,255,.5)'}}>{BASE}</span></div>
                  <div>City: <span style={{color:'rgba(255,255,255,.5)'}}>{city}</span> · Zip: <span style={{color:'rgba(255,255,255,.5)'}}>{zip}</span></div>
                  <div>Profile: <span style={{color:'rgba(255,255,255,.5)'}}>{profileId}</span></div>
                </div>
              </div>
              {allMock && (
                <div style={{ marginTop:12, padding:'10px 12px', background:'rgba(245,158,11,.08)', borderRadius:8, border:'0.5px solid rgba(245,158,11,.2)', fontSize:12, color:'#f59e0b', lineHeight:1.6 }}>
                  <strong>Next step:</strong> go to the Pipeline tab and click "🚀 Full pipeline" to scrape and extract real events. Then reload the page.
                </div>
              )}
            </div>
          )}

          {/* ── Inspect tab ── */}
          {tab === 'inspect' && (
            <div style={s.section}>
              <div style={s.h}>Read-only API checks — fire &amp; copy responses to Claude</div>
              {INSPECT.map(({ key, label, path }) => (
                <div key={key} style={{ marginBottom:14, paddingBottom:14, borderBottom:'0.5px solid rgba(255,255,255,.06)' }}>
                  <div style={s.row}>
                    <button style={{ ...s.btn(), opacity: loading[key] ? 0.5 : 1 }}
                      onClick={() => fire(key, path)} disabled={loading[key]}>
                      {loading[key] ? '⏳ Loading…' : label}
                    </button>
                  </div>
                  <ResultRow k={key} />
                </div>
              ))}
            </div>
          )}

          {/* ── Pipeline tab ── */}
          {tab === 'pipeline' && (
            <div style={s.section}>
              <div style={s.h}>Pipeline actions — these write to the database</div>
              <div style={{ marginBottom:14, padding:'10px 12px', background:'rgba(52,211,153,.06)', border:'0.5px solid rgba(52,211,153,.15)', borderRadius:8, fontSize:12, color:'rgba(52,211,153,.8)', lineHeight:1.6 }}>
                <strong>First time setup:</strong> click "🚀 Full pipeline" below. It will scrape all 19 active sources and extract events into the DB. Takes ~60–90 seconds. Then reload the app — the badge should turn green.
              </div>
              {PIPELINE.map(({ key, label, desc, path, method, body, color }) => (
                <div key={key} style={{ marginBottom:16, paddingBottom:16, borderBottom:'0.5px solid rgba(255,255,255,.06)' }}>
                  <div style={s.row}>
                    <button
                      style={{ ...s.btn(color), opacity: loading[key] ? 0.6 : 1, fontSize:12, padding:'7px 14px' }}
                      onClick={() => fire(key, path, method, body)}
                      disabled={loading[key]}
                    >
                      {loading[key] ? '⏳ Running…' : label}
                    </button>
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', letterSpacing:'.04em', textTransform:'uppercase' }}>{method}</span>
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:4 }}>{desc}</div>
                  <ResultRow k={key} />
                </div>
              ))}
            </div>
          )}

          {/* ── Env tab ── */}
          {tab === 'env' && (
            <div style={s.section}>
              <div style={s.h}>Environment &amp; build info</div>
              <pre style={{ ...s.pre(true), maxHeight: 'none' }}>
{`VITE_API_URL:      ${import.meta.env.VITE_API_URL || '(not set — defaulting to localhost:3001)'}
VITE_SUPABASE_URL:  ${import.meta.env.VITE_SUPABASE_URL ? '✓ set' : '(not set)'}
VITE_SUPABASE_KEY:  ${import.meta.env.VITE_SUPABASE_ANON_KEY ? '✓ set' : '(not set)'}
VITE_UNSPLASH_KEY:  ${import.meta.env.VITE_UNSPLASH_ACCESS_KEY ? '✓ set' : '(not set)'}

Screen:             ${window.innerWidth} × ${window.innerHeight}px
Device pixel ratio: ${window.devicePixelRatio}
User agent:         ${navigator.userAgent}`}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  // ── Auth-free: no login required, all local + optional Supabase sync ──
  const { settings, update, activeProfile, updateProfile, addProfile, removeProfile, switchProfile } = useSettings(null);

  const isMobile = useIsMobile();

  // ── Live data hooks (fall back to mock if backend down) ──
  const { activities,         source: activitiesSource } = useActivities(settings.city, activeProfile);
  const { activities: weekdayActivities }                = useWeekdayActivities(settings.city, activeProfile);
  const { weather,            source: weatherSource    } = useWeather(settings.city);
  const { photos }                                       = usePhotos(settings.city);

  // ── Post-event feedback ──
  const { prompt: feedbackPrompt, respond: respondFeedback } = usePostEventFeedback(activeProfile?.id, settings.city);

  // ── Screen state ──
  const [screen,        setScreen]        = useState('ambient');
  const [weatherDay,    setWeatherDay]    = useState(null);
  const [calModal,      setCalModal]      = useState(null);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [showPicker,    setShowPicker]    = useState(false);
  const [showSaved,     setShowSaved]     = useState(false);
  const [calQueue,      setCalQueue]      = useState([]);
  const [transitioning, setTransitioning] = useState(false);

  const ambientEnteredAt = useRef(null);
  const idleTimer        = useRef(null);

  // Track ambient entry time for profile-picker threshold
  useEffect(() => {
    if (screen === 'ambient') ambientEnteredAt.current = Date.now();
  }, [screen]);

  // Auto-return to ambient after idle
  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current);
    if (screen !== 'ambient') {
      const ms = (settings.ambientTimeoutMinutes || 10) * 60 * 1000;
      idleTimer.current = setTimeout(() => transitionTo('ambient'), ms);
    }
  };
  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimer.current);
  }, [screen, settings.ambientTimeoutMinutes]);

  const transitionTo = (nextScreen) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setScreen(nextScreen);
      setTransitioning(false);
    }, 50);
  };

  const exitAmbient = () => {
    const inAmbientMs = Date.now() - (ambientEnteredAt.current || 0);
    const threshold   = (settings.ambientTimeoutMinutes || 10) * 60 * 1000;
    if (inAmbientMs > threshold && settings.profiles?.length > 1) {
      setShowPicker(true);
    } else {
      transitionTo('active');
    }
  };

  const onProfileSelected = (profileId) => {
    switchProfile(profileId);
    setShowPicker(false);
    transitionTo('active');
  };

  // Calendar add -- also tracks for post-event feedback
  const onAdded = (entry) => {
    setCalQueue(q => [...q, entry]);
    setCalModal(null);
    if (entry?.title) trackForFeedback(entry);
  };

  // Save item to profile
  const onSaveItem = (item) => {
    const current = activeProfile?.savedItems || [];
    if (!current.find(s => s.title === item.title)) {
      updateProfile(activeProfile.id, { savedItems: [...current, item] });
    }
  };

  const onRemoveSaved = (item) => {
    updateProfile(activeProfile.id, {
      savedItems: (activeProfile?.savedItems || []).filter(s => s.title !== item.title),
    });
  };

  // Feedback loop -- thumbs up/down posts to backend and updates profile prefs
  const onThumbUp = async (catId, act) => {
    // Post to backend
    if (act.id) {
      postFeedback(activeProfile?.id, act.id, act.content_type || 'event', 'up', settings.city)
        .catch(() => {});
    }
    // Also save to profile liked tags so future AI prompts know about it
    const likedTags = [...new Set([...(activeProfile?.likedTags || []), ...(act.tags || [])])];
    updateProfile(activeProfile.id, { likedTags });
  };

  const onThumbDown = async (catId, act) => {
    if (act.id) {
      postFeedback(activeProfile?.id, act.id, act.content_type || 'event', 'down', settings.city)
        .catch(() => {});
    }
    const dislikedTags = [...new Set([...(activeProfile?.dislikedTags || []), ...(act.tags || [])])];
    updateProfile(activeProfile.id, { dislikedTags });
  };

  // Common props passed to all screen components
  const commonProps = {
    settings,
    activeProfile,
    calQueue,
    activities,
    weather,
    activitiesSource,
    weatherSource,
    isMobile,
    onCalendar:      setCalModal,
    onWeather:       setWeatherDay,
    onSettings:      (patch) => patch && typeof patch === 'object' ? update(patch) : setSettingsOpen(true),
    onAmbient:       () => transitionTo('ambient'),
    onSwitchProfile: () => setShowPicker(true),
    onSaveItem,
    onRemoveSaved,
    onShowSaved:     () => setShowSaved(true),
    onThumbUp,
    onThumbDown,
  };

  // ── Onboarding -- show on first launch ──
  if (!settings.onboardingDone) {
    return (
      <OnboardingFlow
        showDemoButton={true}
        onComplete={(patch) => {
          update({ ...patch, onboardingDone: true });
        }}
      />
    );
  }

  return (
    <div
      style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'relative', background:'#1C1A17' }}
      onPointerMove={resetIdleTimer}
      onPointerDown={resetIdleTimer}
    >
      {/* ── Screens ── */}
      {screen === 'ambient' && (
        <AmbientMode
          city={settings.city}
          weather={weather}
          activities={activities}
          photos={photos}
          calQueue={calQueue}
          activeProfile={activeProfile}
          settings={settings}
          onActivate={exitAmbient}
          onWeather={setWeatherDay}
        />
      )}

      {screen === 'active'  && <ActiveMode  {...commonProps} />}
      {screen === 'weekday' && <WeekdayMode {...commonProps} activities={weekdayActivities} />}

      {/* ── Weekend / Weeknight toggle ── */}
      {(screen === 'active' || screen === 'weekday') && (
        <div style={{
          position:'fixed', top:9, left:'50%', transform:'translateX(-50%)',
          zIndex:30, display:'flex',
          background:'rgba(255,255,255,.06)',
          border:'0.5px solid rgba(255,255,255,.12)',
          borderRadius:99, overflow:'hidden',
        }}>
          <button
            onClick={() => transitionTo('active')}
            style={{
              padding:'4px 16px', fontSize:11, fontWeight:500, cursor:'pointer',
              background: screen==='active' ? 'rgba(255,255,255,.15)' : 'transparent',
              color:      screen==='active' ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.4)',
              border:'none', fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}
          >Weekend</button>
          <button
            onClick={() => transitionTo('weekday')}
            style={{
              padding:'4px 16px', fontSize:11, fontWeight:500, cursor:'pointer',
              background: screen==='weekday' ? 'rgba(147,124,215,0.3)' : 'transparent',
              color:      screen==='weekday' ? '#C4B5FD' : 'rgba(255,255,255,.4)',
              border:'none', fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}
          >Weeknight</button>
        </div>
      )}

      {/* ── Overlays ── */}
      {weatherDay !== null && (
        <WeatherScreen
          initialDay={weatherDay}
          city={settings.city}
          weather={weather}
          onClose={() => setWeatherDay(null)}
        />
      )}

      {settingsOpen && (
        <SettingsScreen
          settings={settings}
          activeProfile={activeProfile}
          onSave={update}
          updateProfile={updateProfile}
          addProfile={addProfile}
          removeProfile={removeProfile}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {calModal && (
        <CalendarModal
          activity={calModal}
          gcalConnected={settings.gcalConnected}
          onClose={() => setCalModal(null)}
          onAdded={onAdded}
          profileId={activeProfile?.id}
        />
      )}

      {showPicker && (
        <ProfilePicker
          profiles={settings.profiles}
          activeId={settings.activeProfileId}
          onSelect={onProfileSelected}
          onClose={() => { setShowPicker(false); transitionTo('active'); }}
        />
      )}

      {showSaved && (
        <SavedPage
          savedItems={activeProfile?.savedItems || []}
          onCalendar={(act) => { setCalModal(act); setShowSaved(false); }}
          onRemove={onRemoveSaved}
          onClose={() => setShowSaved(false)}
        />
      )}

      {/* ── Post-event feedback toast ── */}
      <PostEventFeedback prompt={feedbackPrompt} onRespond={respondFeedback} />

      {/* ── Debug panel -- always visible during active development ── */}
      <DebugPanel
        activitiesSource={activitiesSource}
        weatherSource={weatherSource}
        settings={settings}
        activeProfile={activeProfile}
      />
    </div>
  );
}
