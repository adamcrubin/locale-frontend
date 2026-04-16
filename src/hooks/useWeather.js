import { useState, useEffect, useCallback } from 'react';
import { fetchWeather } from '../lib/api';
import { WEATHER } from '../data/content'; // fallback

export function useWeather(city) {
  const [weather, setWeather] = useState(WEATHER); // start with mock
  const [loading, setLoading] = useState(false);
  const [source,  setSource]  = useState('mock');

  const load = useCallback(async () => {
    if (!city) return;
    setLoading(true);
    try {
      const data = await fetchWeather(city);
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
  }, [city]);

  useEffect(() => { load(); }, [load]);

  return { weather, loading, source, reload: load };
}
