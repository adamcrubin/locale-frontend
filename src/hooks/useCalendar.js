// ── useCalendar.js ────────────────────────────────────────────────────────────
//
// Google Calendar integration, now unified with Google Sign-In.
//
// When user signs in with Google via Supabase, we get a provider_token (Google
// OAuth access token) stored in sessionStorage as 'locale-gcal-token'.
// We send this to the backend as the userId for calendar operations.
//
// Fallback: if no provider_token, fall back to the old deviceId-based flow
// (for users who connected calendar separately before auth was added).

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCalendarEvents, addCalendarEvent } from '../lib/api';

function getDeviceId() {
  try {
    let id = localStorage.getItem('locale-device-id');
    if (!id) {
      id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('locale-device-id', id);
    }
    return id;
  } catch { return 'anonymous'; }
}

function getGcalToken() {
  try { return sessionStorage.getItem('locale-gcal-token'); } catch { return null; }
}

export function useCalendar(activeProfile) {
  const profileId = activeProfile?.id || 'default';
  const BASE      = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  // Prefer Google OAuth token from sign-in; fall back to deviceId
  const gcalToken = getGcalToken();
  const deviceId  = gcalToken || getDeviceId();

  const [connected, setConnected] = useState(false);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [email,     setEmail]     = useState(null);
  const pollRef = useRef(null);

  // Check connection on mount / profile change
  useEffect(() => {
    checkStatus();
  }, [profileId, gcalToken]);

  // Listen for postMessage from OAuth popup (legacy flow)
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === 'gcal_connected' && e.data?.profileId === profileId) {
        setConnected(true);
        setEmail(e.data.email);
        loadEvents();
        if (pollRef.current) clearInterval(pollRef.current);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [profileId]);

  const checkStatus = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE}/auth/google/status?userId=${encodeURIComponent(deviceId)}&profileId=${profileId}`);
      const data = await res.json();
      setConnected(data.connected);
      if (data.email) setEmail(data.email);
      if (data.connected) loadEvents();
    } catch (e) {
      console.warn('[calendar] Status check failed:', e.message);
    }
  }, [deviceId, profileId]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCalendarEvents(profileId, deviceId);
      setEvents(data || []);
    } catch (e) {
      console.warn('[calendar] Could not load events:', e.message);
      setEvents([]);
    }
    setLoading(false);
  }, [profileId, deviceId]);

  // connect() — for users without Google Sign-In (legacy popup flow)
  const connect = useCallback(() => {
    const popup = window.open(
      `${BASE}/auth/google?userId=${encodeURIComponent(deviceId)}&profileId=${profileId}`,
      'gcal_oauth', 'width=600,height=700,scrollbars=yes'
    );
    let tries = 0;
    pollRef.current = setInterval(async () => {
      tries++;
      if (popup?.closed) {
        clearInterval(pollRef.current);
        await checkStatus();
        return;
      }
      if (tries % 3 === 0) await checkStatus();
    }, 1000);
    setTimeout(() => { if (pollRef.current) clearInterval(pollRef.current); }, 180000);
  }, [deviceId, profileId, checkStatus]);

  const disconnect = useCallback(async () => {
    try {
      await fetch(`${BASE}/auth/google/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deviceId, profileId }),
      });
    } catch {}
    setConnected(false);
    setEvents([]);
    setEmail(null);
  }, [deviceId, profileId]);

  const addEvent = useCallback(async (activity) => {
    if (!connected) return false;
    try {
      await addCalendarEvent({ ...activity, profileId, userId: deviceId });
      await loadEvents();
      return true;
    } catch (e) {
      console.warn('[calendar] Could not add event:', e.message);
      return false;
    }
  }, [connected, profileId, deviceId, loadEvents]);

  const hasConflict = useCallback((activity) => {
    if (!events.length || !activity.start_date) return false;
    const actDate = activity.start_date?.split('T')[0];
    return events.some(e => {
      const evDate = e.start?.dateTime?.split('T')[0] || e.start?.date;
      if (evDate !== actDate) return false;
      if (activity.start_time && e.start?.dateTime) {
        const actH = parseInt(activity.start_time);
        const evH  = new Date(e.start.dateTime).getHours();
        return Math.abs(actH - evH) < 2;
      }
      return true;
    });
  }, [events]);

  return { connected, events, loading, email, deviceId, connect, disconnect, addEvent, reload: loadEvents, hasConflict };
}
