import { useState, useEffect } from 'react';
import { fetchAmbientPhotos } from '../lib/api';

export function usePhotos(city, category = null) {
  const [photos,  setPhotos]  = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    fetchAmbientPhotos(city)
      .then(data => { if (data?.length > 0) setPhotos(data); })
      .catch(e => console.warn('Photos unavailable:', e.message))
      .finally(() => setLoading(false));
  }, [city]);

  return { photos, loading };
}
