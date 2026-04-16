const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

async function apiFetch(path, options = {}) {
  try {
    const res  = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const data = await res.json();
    if (!data.ok && res.status >= 400) throw new Error(data.error || 'API error');
    return data;
  } catch (e) {
    console.error(`API [${path}]:`, e.message);
    throw e;
  }
}

// ── Weather ───────────────────────────────────────────────────────────────────
export async function fetchWeather(city) {
  const data = await apiFetch(`/weather?city=${encodeURIComponent(city)}`);
  return data.data;
}

// ── Events v2 ─────────────────────────────────────────────────────────────────
export async function fetchEventFeed(zip, profileId, city, options = {}) {
  const { category, limit = 100, offset = 0 } = options;
  const params = new URLSearchParams({ zip, profileId, city, limit, offset });
  if (category) params.set('category', category);
  const data = await apiFetch(`/events?${params}`);
  return data.data;
}

export async function postFeedback(profileId, itemId, itemType, feedback, zipCode = '22046') {
  return apiFetch('/events/feedback', {
    method: 'POST',
    body: JSON.stringify({ profileId, itemId, itemType, feedback, zipCode }),
  });
}

export async function markShown(profileId, eventIds, recIds, zipCode = '22046') {
  return apiFetch('/events/shown', {
    method: 'POST',
    body: JSON.stringify({ profileId, eventIds, recIds, zipCode }),
  });
}

// ── AI Prompts ────────────────────────────────────────────────────────────────
export async function fetchPromptResponse(label, city, profile) {
  const profileParam = profile
    ? '&profile=' + encodeURIComponent(JSON.stringify({
        id: profile.id, prefs: profile.prefs,
        aboutMe: (profile.aboutMe || '').slice(0, 200),
        homeAddress: profile.homeAddress,
      }))
    : '';
  const data = await apiFetch(`/prompts/${encodeURIComponent(label)}?city=${encodeURIComponent(city)}${profileParam}`);
  return data.data;
}

export async function fetchWeekdayPromptResponse(label, city, profile) {
  const profileParam = profile
    ? '&profile=' + encodeURIComponent(JSON.stringify({
        id: profile.id, prefs: profile.prefs,
        aboutMe: (profile.aboutMe || '').slice(0, 200),
        homeAddress: profile.homeAddress,
      }))
    : '';
  const data = await apiFetch(`/weekday-prompts/${encodeURIComponent(label)}?city=${encodeURIComponent(city)}${profileParam}`);
  return data.data;
}

// ── Calendar ──────────────────────────────────────────────────────────────────
export async function fetchCalendarEvents(profileId, userId) {
  const params = new URLSearchParams({ profileId, ...(userId ? { userId } : {}) });
  const data = await apiFetch(`/calendar/events?${params}`);
  return data.events;
}

export async function addCalendarEvent(activity) {
  const data = await apiFetch('/calendar/add', {
    method: 'POST',
    body: JSON.stringify(activity),
  });
  return data.event;
}

// ── Photos ────────────────────────────────────────────────────────────────────
export async function fetchAmbientPhotos(city) {
  const data = await apiFetch(`/photos/ambient?city=${encodeURIComponent(city)}`);
  return data.photos || [];
}

export async function fetchCategoryPhotos(category, city, count = 8) {
  const data = await apiFetch(`/photos/category/${encodeURIComponent(category)}?city=${encodeURIComponent(city)}&count=${count}`);
  return data.photos || [];
}

// ── Health ────────────────────────────────────────────────────────────────────
export async function checkBackendHealth() {
  try {
    const data = await apiFetch('/health');
    return { online: true, ...data };
  } catch {
    return { online: false };
  }
}
