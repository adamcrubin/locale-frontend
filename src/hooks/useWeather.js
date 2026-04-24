import { useState, useEffect, useCallback } from 'react';
import { fetchWeather } from '../lib/api';
import { WEATHER } from '../data/content'; // fallback

// `location` can be a city string OR the neighborhood object from settings
// ({ label, area, zip, lat, lng }). When lat/lng are present we send them
// directly to the backend for per-neighborhood accuracy.
export function useWeather(location) {
  const [weather, setWeather] = useState(WEATHER);
  const [loading, setLoading] = useState(false);
  const [source,  setSource]  = useState('mock');

  const load = useCallback(async () => {
    if (!location) return;
    setLoading(true);
    try {
      const data = await fetchWeather(location);
      if (data?.days?.length > 0) {
        setWeather(data.days);
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
