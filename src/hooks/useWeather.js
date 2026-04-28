import { useState, useEffect, useCallback } from 'react';
import { fetchWeather } from '../lib/api';
import { WEATHER } from '../data/content'; // fallback

const CACHE_KEY = 'locale-weather-cache-v1';

// Merge incoming days with cached days. Per-day, per-hour: fresh hours
// override cached, but cached hours stay if fresh doesn't have them. Solves
// the "past hours disappearing" issue — once Render's in-memory cache TTL
// expires and NWS only returns future hours, the chart used to lose its
// pre-now portion. Now those past temps stay around (locally) for the
// rest of the day.
function mergeWeatherDays(fresh, cached) {
  if (!Array.isArray(fresh)) return cached || [];
  if (!Array.isArray(cached) || cached.length === 0) return fresh;
  const cachedByDay = new Map();
  for (const d of cached) cachedByDay.set(d.day, d);
  return fresh.map(d => {
    const prev = cachedByDay.get(d.day);
    if (!prev) return d;
    // Per-hour merge — same logic as backend mergeWeather but on the client.
    const byTime = new Map();
    for (const h of (prev.hours || [])) byTime.set(h.t, h);
    for (const h of (d.hours    || [])) byTime.set(h.t, h);
    const hourToMin = (t) => {
      const m = (t || '').toLowerCase().match(/(\d+)\s*(am|pm)/);
      if (!m) return 0;
      let hh = parseInt(m[1], 10);
      if (m[2] === 'pm' && hh !== 12) hh += 12;
      if (m[2] === 'am' && hh === 12) hh = 0;
      return hh * 60;
    };
    const hours = Array.from(byTime.values()).sort((a, b) => hourToMin(a.t) - hourToMin(b.t));
    return { ...d, hours };
  });
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Drop the cache if it's more than 36 hours old — past that, "today"
    // in the cache is no longer today and the merge could splice yesterday's
    // hours into today's view.
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > 36 * 3600 * 1000) return null;
    return parsed;
  } catch { return null; }
}
function writeCache(days) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), days })); } catch {}
}

// `location` can be a city string OR the neighborhood object from settings
// ({ label, area, zip, lat, lng }). When lat/lng are present we send them
// directly to the backend for per-neighborhood accuracy.
export function useWeather(location) {
  const [weather, setWeather] = useState(() => {
    const c = readCache();
    return (c?.days?.length ? c.days : WEATHER);
  });
  const [loading, setLoading] = useState(false);
  const [source,  setSource]  = useState('mock');

  const load = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const data = await fetchWeather(location);
      if (data?.days?.length > 0) {
        const cached = readCache();
        const merged = mergeWeatherDays(data.days, cached?.days);
        setWeather(merged);
        writeCache(merged);
        setSource(data.source || 'live');
      }
    } catch (e) {
      console.warn('Using mock weather:', e.message);
      setSource('mock');
    } finally {
      setLoading(false);
    }
  }, [
    // Depend on the bits that actually change the request URL so the hook
    // refetches when the user picks a new neighborhood.
    typeof location === 'string' ? location : location?.lat,
    typeof location === 'string' ? null      : location?.lng,
    typeof location === 'string' ? null      : location?.zip,
  ]);

  useEffect(() => { load(); }, [load]);

  return { weather, loading, source, reload: load };
}
