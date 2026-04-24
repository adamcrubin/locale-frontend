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
// Accepts a city string OR a neighborhood object { lat, lng, zip, label }.
// Neighborhood objects get sent as lat/lng params (skipping backend geocode).
export async function fetchWeather(input) {
  const params = new URLSearchParams();
  if (input && typeof input === 'object' && Number.isFinite(input.lat)) {
    params.set('lat', input.lat);
    params.set('lng', input.lng);
    if (input.label) params.set('city', input.label);
  } else if (typeof input === 'string') {
    params.set('city', input);
  }
  const data = await apiFetch(`/weather?${params}`);
  return data.data;
}

// ── Events v2 ─────────────────────────────────────────────────────────────────
// BUG FIX: weekday param was previously destructured but never added to the
// URLSearchParams, so useWeekdayActivities always received weekend events.
//
// Also now sends a trimmed profile JSON so the backend scoring engine can apply
// preference matching. Without this, profile.prefs had no effect on final_score.
export async function fetchEventFeed(zip, profileId, city, options = {}) {
  const { category, weekday = false, limit = 100, offset = 0, profile = null, userLat = null, userLng = null, userId = null } = options;
  const params = new URLSearchParams({ zip, profileId, city, limit, offset });
  if (category) params.set('category', category);
  if (weekday) params.set('weekday', 'true');
  if (userLat != null) params.set('userLat', userLat);
  if (userLng != null) params.set('userLng', userLng);
  if (userId)   params.set('userId', userId);
  if (profile) {
    params.set('profile', encodeURIComponent(JSON.stringify({
      id:      profile.id,
      prefs:   profile.prefs || [],
      aboutMe: (profile.aboutMe || '').slice(0, 200),
      budget:  profile.budget,
    })));
  }
  const data = await apiFetch(`/events?${params}`);
  return data.data;
}

export async function postFeedback(profileId, itemId, itemType, feedback, zipCode = 'dc-metro') {
  return apiFetch('/events/feedback', {
    method: 'POST',
    body: JSON.stringify({ profileId, itemId, itemType, feedback, zipCode }),
  });
}

export async function markShown(profileId, eventIds, recIds, zipCode = 'dc-metro') {
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

// ── Friends ───────────────────────────────────────────────────────────────────
// In auto-all mode, this returns every other Supabase user so the
// friends_interested indicator has signal without an invite flow. When
// FRIENDS_AUTO_ALL=false on the backend, this returns the accepted friendships
// from the friendships table and the invite/accept/decline endpoints take over.
export async function fetchFriends(userId) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  const data = await apiFetch(`/friends?${params}`);
  return { friends: data.friends || [], autoAll: !!data.auto_all };
}
export async function fetchFriendsPending(userId) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  const data = await apiFetch(`/friends/pending?${params}`);
  return data.pending || [];
}
export async function inviteFriend(email, userId) {
  return apiFetch('/friends/invite', {
    method: 'POST',
    body: JSON.stringify({ email, userId }),
  });
}
export async function acceptFriend(id, userId) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  return apiFetch(`/friends/${id}/accept?${params}`, { method: 'POST' });
}
export async function declineFriend(id, userId) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  return apiFetch(`/friends/${id}/decline?${params}`, { method: 'POST' });
}
export async function removeFriend(friendshipId, userId) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  return apiFetch(`/friends/${friendshipId}?${params}`, { method: 'DELETE' });
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
