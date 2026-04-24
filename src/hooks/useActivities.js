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
      friends_interested: e.friends_interested || [],
      image_url:  e.image_url || null,
      reservation_url:       e.reservation_url       || null,
      reservation_platform:  e.reservation_platform  || null,
      reservation_is_search: !!e.reservation_is_search,
    }));

    // Map always-available evergreen venues from the `evergreen_events` table.
    // These don't have a specific date — they're parks, restaurants, museums etc.
    // They render identically to events in the feed columns.
    const evergreens = (data.evergreens || []).map(e => ({
      ...e,
      title:      e.title,
      when:       e.when_display || e.when_pattern || 'Check schedule',
      where:      e.venue ? `${e.venue}${e.neighborhood ? ', ' + e.neighborhood : ''}` : e.neighborhood,
      cost:       e.cost_display || e.cost_range || null,
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
        cost:       rec.cost_range || null,
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

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes — show cached data instantly, refresh behind the scenes

function cacheKey(zip, profileId) { return `locale_feed_${zip}_${profileId}`; }

function readCache(zip, profileId) {
  try {
    const raw = localStorage.getItem(cacheKey(zip, profileId));
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null; // expired
    return data;
  } catch { return null; }
}

function writeCache(zip, profileId, data) {
  try {
    localStorage.setItem(cacheKey(zip, profileId), JSON.stringify({ ts: Date.now(), data }));
  } catch {} // storage full or unavailable — silently ignore
}

export function useActivities(city, profile, locationOverride = null, user = null) {
  // All event queries use the metro-wide zip — specific location used only for distance scoring
  const zip       = 'dc-metro';
  const profileId = profile?.id || 'default';
  const userLat   = locationOverride?.lat ?? null;
  const userLng   = locationOverride?.lng ?? null;
  const userId    = user?.id || null;

  // Seed state from cache immediately so UI renders real data without waiting for the API.
  // Falls back to mock ACTIVITIES if nothing cached yet.
  const [activities, setActivities] = useState(() => {
    const cached = readCache(zip, profileId);
    return cached || ACTIVITIES;
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [source,  setSource]  = useState(() => readCache(zip, profileId) ? 'cached' : 'mock');

  const load = useCallback(async (force = false) => {
    if (!city) return;
    // If cache is fresh and this isn't a forced reload, skip the API call
    if (!force && readCache(zip, profileId)) {
      // Still refresh in background after a short delay so data stays current
      setTimeout(() => load(true), 3000);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventFeed(zip, profileId, city, { profile, userLat, userLng, userId });
      const transformed = transformFeed(data);
      if (transformed && Object.keys(transformed).length > 0) {
        const hasEvents = Object.values(transformed).some(acts => acts.length > 0);
        if (hasEvents) {
          setActivities(transformed);
          setSource('live');
          writeCache(zip, profileId, transformed);
        }
      }
    } catch (e) {
      console.warn('[useActivities] API error, using cache/mock:', e.message);
      setError(e.message);
      if (source === 'mock') setSource('mock');
    } finally {
      setLoading(false);
    }
  }, [city, profileId, userId]);

  useEffect(() => { load(); }, [load]);

  return { activities, loading, error, source, reload: () => load(true) };
}
