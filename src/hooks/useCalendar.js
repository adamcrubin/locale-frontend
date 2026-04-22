// ── useCalendar.js ────────────────────────────────────────────────────────────
//
// Manages Google Calendar OAuth and event sync.
//
// Auth strategy: uses a stable deviceId (UUID stored in localStorage) as the
// userId for the OAuth flow. No Supabase auth required -- the backend stores
// tokens keyed by deviceId + profileId.
//
// Flow:
//   1. connect() opens a popup to /api/auth/google?userId=DEVICE_ID&profileId=X
//   2. Backend redirects to Google OAuth, gets tokens, stores in google_tokens
//   3. Popup closes and postMessages 'gcal_connected' back to parent
//   4. useCalendar catches the message, sets connected=true, loads events
//   5. Events shown in WeekendSidebar and checked for conflicts

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchCalendarEvents, addCalendarEvent } from '../lib/api';

// Get or create a stable device ID -- used as userId for the OAuth flow
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

export function useCalendar(activeProfile) {
  const profileId  = activeProfile?.id || 'default';
  const deviceId   = getDeviceId();
  const BASE        = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const [connected, setConnected] = useState(false);
  const [events,    setEvents]    = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [email,     setEmail]     = useState(null);
  const pollRef = useRef(null);

  // Check connection status on mount and when profileId changes
  useEffect(() => {
    checkStatus();
  }, [profileId]);

  // Listen for postMessage from the OAuth popup
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
      const res  = await fetch(`${BASE}/auth/google/status?userId=${deviceId}&profileId=${profileId}`);
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

  // Open OAuth popup and poll for completion
  const connect = useCallback(() => {
    const popup = window.open(
      `${BASE}/auth/google?userId=${deviceId}&profileId=${profileId}`,
      'gcal_oauth',
      'width=600,height=700,scrollbars=yes'
    );

    // Fallback polling in case postMessage doesn't fire
    pollRef.current = setInterval(async () => {
      if (popup?.closed) {
        clearInterval(pollRef.current);
        await checkStatus();
      }
    }, 1500);

    // Stop polling after 3 minutes
    setTimeout(() => clearInterval(pollRef.current), 180000);
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

  // Check if an event conflicts with existing calendar entries
  const hasConflict = useCallback((activity) => {
    if (!events.length || !activity.start_date) return false;
    const actDate = activity.start_date?.split('T')[0];
    return events.some(e => {
      const evDate = e.start?.dateTime?.split('T')[0] || e.start?.date;
      if (evDate !== actDate) return false;
      // If both have times, check overlap
      if (activity.start_time && e.start?.dateTime) {
        const actH = parseInt(activity.start_time);
        const evH  = new Date(e.start.dateTime).getHours();
        return Math.abs(actH - evH) < 2; // within 2 hours = conflict
      }
      return true; // same day, no time = soft conflict
    });
  }, [events]);

  return {
    connected, events, loading, email, deviceId,
    connect, disconnect, addEvent, reload: loadEvents, hasConflict,
  };
}
