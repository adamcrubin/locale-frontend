import { useState, useEffect, useCallback } from 'react';
import { fetchEventFeed } from '../lib/api';
import { ACTIVITIES } from '../data/content';

// Transform new feed format {category: {events, pinned_rec}} 
// into the grouped format components expect {category: [...activities]}
function transformFeed(feed) {
  if (!feed || typeof feed !== 'object') return null;
  const grouped = {};
  for (const [cat, data] of Object.entries(feed)) {
    const events = (data.events || []).map(e => ({
      ...e,
      // Normalize fields to match existing card component expectations
      title:      e.title,
      when:       e.when_display || e.start_date || 'This weekend',
      where:      e.venue ? `${e.venue}${e.neighborhood ? ', ' + e.neighborhood : ''}` : e.neighborhood,
      cost:       e.cost_display || 'See details',
      why:        e.description || '',
      tags:       e.tags || [],
      expires:    !!e.expires_at,
      reservable: e.cost_cents_min > 0,
      address:    e.address,
      url:        e.url,
      // New v2 fields
      id:           e.id,
      content_type: 'event',
      base_score:   e.base_score,
      final_score:  e.final_score,
      confidence:   e.confidence,
    }));

    // Add pinned rec if present
    const rec = data.pinned_rec;
    if (rec) {
      events.push({
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
        // Mark as recommendation
        id:           rec.id,
        content_type: 'recommendation',
        is_pinned:    true,
        base_score:   rec.base_score,
        final_score:  rec.final_score,
      });
    }

    grouped[cat] = events;
  }
  return grouped;
}

export function useActivities(city, profile) {
  const [activities, setActivities] = useState(ACTIVITIES);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [source,     setSource]     = useState('mock');

  const zip       = city?.match(/\b(\d{5})\b/)?.[1] || '22046';
  const profileId = profile?.id || 'default';

  const load = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEventFeed(zip, profileId, city);
      const transformed = transformFeed(data);
      if (transformed && Object.keys(transformed).length > 0) {
        // Check if we have any real events (not just empty categories)
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
