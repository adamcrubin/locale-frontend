// ── useActivities.js ──────────────────────────────────────────────────────────
//
// Fetches the scored weekend event feed from the backend and transforms it into
// the shape that card components expect.
//
// Data flow:
//   backend GET /api/events
//     → returns { [category]: { events[], evergreens[], pinned_rec, total } }
//   transformFeed()
//     → maps each category into a flat array of Activity objects
//     → merges events + evergreens, appends pinned_rec at the end
//   setActivities(transformed)
//     → components read activities[categoryId] as a flat array
//
// Fallback: starts with ACTIVITIES mock from content.js so the UI renders
// immediately. Replaced with live data once the API responds successfully.
// source state tells the DataBadge component whether we're on "live" or "mock".

import { useState, useEffect, useCallback } from 'react';
import { fetchEventFeed } from '../lib/api';
import { ACTIVITIES } from '../data/content';

// Transform the backend feed shape into the flat per-category arrays that
// card components expect. Called once per successful API response.
//
// Backend shape:  { category: { events[], evergreens[], pinned_rec, total } }
// Output shape:   { category: Activity[] }
//   — events first, then evergreens, then pinned_rec appended last with is_pinned:true
//
// FIX: now also maps evergreens[] (always-available venues/parks) into the
// activity array alongside time-bound events. Previously evergreens were
// returned by the backend but silently discarded here.
function transformFeed(feed) {
  if (!feed || typeof feed !== 'object') return null;
  const grouped = {};

  for (const [cat, data] of Object.entries(feed)) {
    // Map time-bound events from the `events` table
    const events = (data.events || []).map(e => ({
      ...e,
      title:      e.title,
      when:       e.when_display || e.start_date || 'This weekend',
      where:      e.venue ? `${e.venue}${e.neighborhood ? ', ' + e.neighborhood : ''}` : e.neighborhood,
      cost:       e.cost_display || null,   // null = formatCost will guess; never 'See details'
      why:        e.description || '',
      tags:       e.tags || [],
      categories: e.categories || [],
      expires:    !!e.expires_at,
      reservable: e.cost_cents_min > 0,
      address:    e.address,
      url:        e.url,
      start_date: e.start_date,
      start_time: e.start_time,
      end_time:   e.end_time,
      neighborhood: e.neighborhood,
      venue:      e.venue,
      id:           e.id,
      content_type: 'event',
      base_score:   e.base_score,
      final_score:  e.final_score,
      confidence:   e.confidence,
    }));

    // Map always-available evergreen venues from the `evergreen_events` table.
    // These don't have a specific date — they're parks, restaurants, museums etc.
    // They render identically to events in the feed columns.
    const evergreens = (data.evergreens || []).map(e => ({
      ...e,
      title:      e.title,
      when:       e.when_display || e.when_pattern || 'Check schedule',
      where:      e.venue ? `${e.venue}${e.neighborhood ? ', ' + e.neighborhood : ''}` : e.neighborhood,
      cost:       e.cost_display || e.cost_range || 'See details',
      why:        e.description || '',
      tags:       e.tags || [],
      expires:    false,       // evergreens never expire
      reservable: false,       // evergreens aren't directly bookable
      address:    e.address,
      url:        e.source_url || e.url,
      id:           e.id,
      content_type: 'evergreen',
      base_score:   e.base_score,
      final_score:  e.final_score,
    }));

    // Append the top evergreen as `pinned_rec` — rendered with a special
    // pinned visual treatment at the bottom of the category column.
    const rec = data.pinned_rec;
    if (rec) {
      evergreens.push({
        ...rec,
        title:      rec.title,
        when:       rec.when_pattern || 'Check schedule',
        where:      rec.venue ? `${rec.venue}${rec.neighborhood ? ', ' + rec.neighborhood : ''}` : rec.neighborhood,
        cost:       rec.cost_range || 'See details',
        why:        rec.description || '',
        tags:       rec.tags || [],
        expires:    false,
        reservable: false,
        address:    rec.address,
        url:        rec.source_url,
        id:           rec.id,
        content_type: 'recommendation',
        is_pinned:    true,   // triggers pinned visual treatment in column
        base_score:   rec.base_score,
        final_score:  rec.final_score,
      });
    }

    // Combine: time-bound events first (sorted by final_score from backend),
    // then evergreens (also pre-sorted), then pinned_rec last.
    grouped[cat] = [...events, ...evergreens];
  }
  return grouped;
}

export function useActivities(city, profile) {
  const [activities, setActivities] = useState(ACTIVITIES); // start with mock
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [source,     setSource]     = useState('mock');

  // Extract zip from city string (e.g. "Falls Church, VA 22046" → "22046").
  // Falls back to 22046 (Falls Church) if no zip found in the city string.
  const zip       = city?.match(/\b(\d{5})\b/)?.[1] || '22046';
  const profileId = profile?.id || 'default';

  const load = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    setError(null);
    try {
      // Pass the full profile so the backend can apply preference scoring.
      // Without profile, prefs have no effect on final_score.
      const data = await fetchEventFeed(zip, profileId, city, { profile });
      const transformed = transformFeed(data);
      if (transformed && Object.keys(transformed).length > 0) {
        // Only switch to live data if at least one category has actual content.
        // An empty but valid response keeps mock data so the UI doesn't go blank.
        const hasEvents = Object.values(transformed).some(acts => acts.length > 0);
        if (hasEvents) {
          setActivities(transformed);
          setSource('live');
        }
      }
    } catch (e) {
      console.warn('[useActivities] Using mock data:', e.message);
      setSource('mock');
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [city, profileId]);

  useEffect(() => { load(); }, [load]);

  return { activities, loading, error, source, reload: load };
}
