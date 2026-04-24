// ── useAuth.js ────────────────────────────────────────────────────────────────
//
// Google Sign-In via Supabase OAuth.
// Sessions persisted by Supabase automatically (localStorage).
// "Remember me" = store locale-remember-me flag so returning users skip welcome.
//
// Flow:
//   1. signInWithGoogle() → redirects to Google, Supabase handles callback
//   2. On return, onAuthStateChange fires SIGNED_IN with provider_token
//   3. user.id = key for household_settings in Supabase
//   4. provider_token (Google access token) stored for Calendar use

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export function useAuth() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!isSupabaseEnabled) { setLoading(false); return; }

    // Restore session on mount (handles returning users)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        try { sessionStorage.setItem('locale-gcal-token', session.provider_token); } catch {}
      }
      setLoading(false);
    });

    // Listen for auth state changes (OAuth redirect return, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        try { sessionStorage.setItem('locale-gcal-token', session.provider_token); } catch {}
      }
      if (event === 'SIGNED_OUT') {
        try { sessionStorage.removeItem('locale-gcal-token'); } catch {}
      }

      // On sign-in, automatically store Calendar tokens in backend so the
      // Calendar API works without a separate "Connect Calendar" popup.
      if (event === 'SIGNED_IN' && session?.provider_token) {
        const userId    = session.user?.id    || 'anonymous';
        const email     = session.user?.email || null;
        const profileId = (() => { try { return localStorage.getItem('locale-active-profile') || 'default'; } catch { return 'default'; } })();
        const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        fetch(`${BASE}/auth/google/store-tokens`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            access_token:  session.provider_token,
            refresh_token: session.provider_refresh_token || null,
            email,
            userId,
            profileId,
          }),
        }).catch(() => {}); // fire-and-forget — never block the auth flow
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Google OAuth — redirects to Google then back to app
  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseEnabled) {
      setError('Auth not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Netlify env vars.');
      return false;
    }
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Request Calendar scope at sign-in time — no second popup ever
          scopes: 'https://www.googleapis.com/auth/calendar',
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) { setError(error.message); setLoading(false); return false; }
      return true; // will redirect; loading stays true
    } catch (e) {
      setError(e.message); setLoading(false); return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseEnabled) return;
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('locale-remember-me');
      sessionStorage.removeItem('locale-gcal-token');
    } catch {}
    setUser(null);
  }, []);

  const getCalendarToken = useCallback(() => {
    try { return sessionStorage.getItem('locale-gcal-token'); } catch { return null; }
  }, []);

  const isRemembered = (() => {
    try { return localStorage.getItem('locale-remember-me') === 'true'; } catch { return false; }
  })();

  return { user, loading, error, signInWithGoogle, signOut, getCalendarToken, isRemembered, isEnabled: isSupabaseEnabled };
}
