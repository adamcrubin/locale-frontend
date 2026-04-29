// ── useCategoryPhotos.js ───────────────────────────────────────────────
//
// One-shot fetch of per-category photo sets, used as desktop card
// backgrounds. Returns a stable map from category id → array of photos.
//
// Cache strategy:
//   - localStorage 24h TTL — same as backend cache, so cold reloads after
//     the backend has refreshed the set still serve instantly.
//   - One backend call per session per city, regardless of how many
//     ActCards mount.
//
// Photo selection per card is the consumer's job — pass a photo array
// and an event id to pickPhoto() to get a stable, hash-based pick.

import { useEffect, useState } from 'react';
import { fetchAllCategoryPhotos } from '../lib/api';

const CACHE_KEY      = 'locale-category-photos-v1';
const CACHE_TTL_MS   = 24 * 3600 * 1000;

function readCache(city) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.city !== city) return null;
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.photos || {};
  } catch { return null; }
}
function writeCache(city, photos) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ city, savedAt: Date.now(), photos }));
  } catch {}
}

export function useCategoryPhotos(city) {
  const [photos, setPhotos] = useState(() => readCache(city) || {});

  useEffect(() => {
    if (!city) return;
    const cached = readCache(city);
    if (cached) {
      setPhotos(cached);
      return;
    }
    let cancelled = false;
    fetchAllCategoryPhotos(city)
      .then(map => {
        if (cancelled) return;
        setPhotos(map);
        writeCache(city, map);
      })
      .catch(() => { /* network or no-key — gracefully render no photos */ });
    return () => { cancelled = true; };
  }, [city]);

  return photos;
}

// Stable photo picker: same event id always picks the same photo from
// the category's set so the card doesn't shuffle on re-render. djb2
// string hash is plenty for this — we just need a deterministic int.
export function pickPhoto(photos, eventId, fallbackIdx = 0) {
  if (!Array.isArray(photos) || photos.length === 0) return null;
  if (!eventId) return photos[fallbackIdx % photos.length] || null;
  let hash = 5381;
  const s = String(eventId);
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) + hash) + s.charCodeAt(i);
  return photos[Math.abs(hash) % photos.length] || null;
}
