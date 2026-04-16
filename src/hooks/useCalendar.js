import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchCalendarEvents, addCalendarEvent } from '../lib/api';

export function useCalendar(user, activeProfile) {
  const [connected,  setConnected]  = useState(false);
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(false);

  const profileId = activeProfile?.id || 'default';

  // Check if this profile has Google connected
  useEffect(() => {
    if (!user?.id || !supabase) return;
    supabase
      .from('google_tokens')
      .select('id, email')
      .eq('user_id', user.id)
      .eq('profile_id', profileId)
      .single()
      .then(({ data }) => {
        setConnected(!!data?.email);
      });
  }, [user?.id, profileId]);

  // Load upcoming calendar events
  const loadEvents = useCallback(async () => {
    if (!connected) return;
    setLoading(true);
    try {
      const data = await fetchCalendarEvents(profileId);
      setEvents(data || []);
    } catch (e) {
      console.warn('[calendar] Could not load events:', e.message);
    }
    setLoading(false);
  }, [connected, profileId]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Add event to Google Calendar
  const addEvent = useCallback(async (activity) => {
    if (!connected) return false;
    try {
      await addCalendarEvent({ ...activity, profileId });
      await loadEvents();
      return true;
    } catch (e) {
      console.warn('[calendar] Could not add event:', e.message);
      return false;
    }
  }, [connected, profileId, loadEvents]);

  // Initiate Google OAuth — opens backend OAuth flow
  const connect = useCallback(() => {
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const userId     = user?.id || 'anonymous';
    window.open(`${backendUrl}/auth/google?userId=${userId}&profileId=${profileId}`, '_blank', 'width=600,height=700');

    // Poll for connection after OAuth window closes
    const pollInterval = setInterval(async () => {
      if (!supabase) { clearInterval(pollInterval); return; }
      const { data } = await supabase
        .from('google_tokens')
        .select('email')
        .eq('user_id', userId)
        .eq('profile_id', profileId)
        .single();
      if (data?.email) {
        setConnected(true);
        clearInterval(pollInterval);
        loadEvents();
      }
    }, 2000);

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(pollInterval), 120000);
  }, [user?.id, profileId, loadEvents]);

  const disconnect = useCallback(async () => {
    if (!supabase || !user?.id) return;
    await supabase
      .from('google_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('profile_id', profileId);
    setConnected(false);
    setEvents([]);
  }, [user?.id, profileId]);

  return { connected, events, loading, connect, disconnect, addEvent, reload: loadEvents };
}
