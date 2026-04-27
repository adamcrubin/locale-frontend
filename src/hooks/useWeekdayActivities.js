import { useState, useEffect, useCallback } from 'react';
import { fetchEventFeed } from '../lib/api';
import { WEEKDAY_ACTIVITIES } from '../data/content';

// Transform feed into weekday grouped format
function transformFeed(feed) {
  if (!feed || typeof feed !== 'object') return null;
  const grouped = {};
  for (const [cat, data] of Object.entries(feed)) {
    const events = (data.events || []).map(e => ({
      ...e,
      title:      e.title,
      when:       e.when_display || e.start_date || 'This week',
      where:      e.venue ? `${e.venue}${e.neighborhood ? ', ' + e.neighborhood : ''}` : e.neighborhood,
      cost:       e.cost_display || 'See details',
      why:        e.description || '',
      tags:       e.tags || [],
      expires:    !!e.expires_at,
      reservable: e.cost_cents_min > 0,
      url:        e.url,
      id:         e.id,
      content_type: 'event',
      final_score: e.final_score,
    }));
    if (data.pinned_rec) {
      const rec = data.pinned_rec;
      events.push({
        ...rec,
        title: rec.title,
        when:  rec.when_pattern || 'Check schedule',
        where: rec.venue,
        cost:  rec.cost_range || 'See details',
        why:   rec.description || '',
        tags:  rec.tags || [],
        id:    rec.id,
        content_type: 'recommendation',
      });
    }
    grouped[cat] = events;
  }
  return grouped;
}

// `profile` is the full profile object — passed through to fetchEventFeed
// so the backend scoring engine can apply preference matching.
//
// `enabled` (default true) gates the fetch — when the user is on the
// weekend feed we don't need weekday activities, so callers pass
// `enabled: screen === 'weekday'` to skip the request entirely. Saves a
// 60-event payload per session for users who never open Weekday mode.
// First call after enabling will hit the network; subsequent screen
// toggles within the session reuse the already-loaded state.
export function useWeekdayActivities(city, profile, enabled = true) {
  const [activities, setActivities] = useState(WEEKDAY_ACTIVITIES);
  const [loading,    setLoading]    = useState(false);
  const [source,     setSource]     = useState('mock');
  const [hasLoaded,  setHasLoaded]  = useState(false);

  const zip       = city?.match(/\b(\d{5})\b/)?.[1] || '22046';
  const profileId = profile?.id || 'default';

  const load = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    try {
      // weekday:true filters the backend to Mon–Thu events only.
      // profile is passed so the backend can apply preference-based scoring.
      const data = await fetchEventFeed(zip, profileId, city, { weekday: true, limit: 60, profile });
      const transformed = transformFeed(data);
      if (transformed && Object.values(transformed).some(a => a.length > 0)) {
        setActivities(transformed);
        setSource('live');
      }
      setHasLoaded(true);
    } catch (e) {
      console.warn('[weekday] Using mock data:', e.message);
      setSource('mock');
    } finally {
      setLoading(false);
    }
  }, [city, profileId]);

  useEffect(() => {
    // Only fetch when caller has enabled the hook AND we haven't already
    // loaded. Avoids re-fetching on every screen flip back to Weekday.
    if (enabled && !hasLoaded) load();
  }, [enabled, hasLoaded, load]);

  return { activities, loading, source, reload: load };
}
