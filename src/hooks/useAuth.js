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

      // On sign-in, store provider_token in backend.
      // - If this SIGNED_IN was triggered by connectCalendar() (the user
      //   clicked something calendar-related), the token includes calendar
      //   scope and we mark `gcal-scope-granted` so the rest of the app
      //   knows calendar API calls will work.
      // - Otherwise it's a plain sign-in: token only has openid/email/profile.
      //   Calendar features will prompt the user to connect later.
      if (event === 'SIGNED_IN' && session?.provider_token) {
        const wasCalendarFlow = (() => {
          try { return localStorage.getItem('locale-gcal-pending') === '1'; } catch { return false; }
        })();
        if (wasCalendarFlow) {
          try {
            localStorage.setItem('locale-gcal-scope-granted', 'true');
            localStorage.removeItem('locale-gcal-pending');
          } catch {}
        }
        const email     = session.user?.email || null;
        const profileId = (() => { try { return localStorage.getItem('locale-active-profile') || 'default'; } catch { return 'default'; } })();
        const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        fetch(`${BASE}/auth/google/store-tokens`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body:    JSON.stringify({
            access_token:  session.provider_token,
            refresh_token: session.provider_refresh_token || null,
            email,
            profileId,
            scopes_include_calendar: wasCalendarFlow,
          }),
        })
          .then(r => r.ok && window.dispatchEvent(new CustomEvent('gcal-tokens-stored', { detail: { userId: session.user?.id } })))
          .catch(() => {});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Google OAuth — redirects to Google then back to app.
  //
  // SCOPE POLICY (May 2026):
  //   Sign-in itself only requests `openid email profile` — the bare minimum
  //   Google needs to identify the user. NO calendar scope here. Users have
  //   said the calendar consent on first sign-in is a trust-killer; many
  //   bail rather than grant it before they've even seen the app.
  //
  //   When the user actually clicks an "Add to calendar" button we trigger
  //   `connectCalendar()` below, which re-runs the OAuth flow with the
  //   calendar scope added. Same Google account, same Supabase session;
  //   Google just shows an incremental consent for the new scope.
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
          // Bare minimum — no calendar.
          scopes: 'openid email profile',
          redirectTo: window.location.origin,
        },
      });
      if (error) { setError(error.message); setLoading(false); return false; }
      return true; // will redirect; loading stays true
    } catch (e) {
      setError(e.message); setLoading(false); return false;
    }
  }, []);

  // Incremental scope grant — called when the user wants to use a calendar
  // feature for the first time. Triggers a fresh OAuth round-trip with the
  // calendar.events scope appended. Google will show an incremental consent
  // screen ("Locale also wants permission to view and edit your calendar
  // events") and on success the new provider_token includes the scope.
  const connectCalendar = useCallback(async () => {
    if (!isSupabaseEnabled) return false;
    try {
      // Pending flag — the auth state listener watches for this and marks
      // scope granted on the next SIGNED_IN. localStorage survives the
      // OAuth redirect; sessionStorage doesn't.
      try { localStorage.setItem('locale-gcal-pending', '1'); } catch {}
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          redirectTo: window.location.origin,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) { setError(error.message); return false; }
      return true;
    } catch (e) {
      setError(e.message); return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseEnabled) return;
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('locale-remember-me');
      localStorage.removeItem('locale-gcal-scope-granted');
      localStorage.removeItem('locale-gcal-pending');
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

  // Does the current session's provider_token include calendar scope?
  // We can't introspect Google scopes from the token alone, so we keep a
  // simple flag in localStorage that connectCalendar() sets after success.
  const hasCalendarScope = (() => {
    try { return localStorage.getItem('locale-gcal-scope-granted') === 'true'; } catch { return false; }
  })();

  return {
    user, loading, error,
    signInWithGoogle, signOut, getCalendarToken,
    connectCalendar, hasCalendarScope,
    isRemembered, isEnabled: isSupabaseEnabled,
  };
}
