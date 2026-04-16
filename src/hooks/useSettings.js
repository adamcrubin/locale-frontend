import { useState, useEffect, useCallback, useRef } from 'react';
import { DEFAULT_SETTINGS } from '../data/content';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

const LOCAL_KEY = 'locale-v3';

// Load from localStorage (fallback / migration source)
function loadLocal() {
  try {
    const s = localStorage.getItem(LOCAL_KEY);
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

// Save to localStorage
function saveLocal(settings) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(settings)); } catch {}
}

// Load settings from Supabase for a user
async function loadRemote(userId) {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('household_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    if (error || !data) return null;
    return { ...DEFAULT_SETTINGS, ...data.settings };
  } catch { return null; }
}

// Save settings to Supabase
async function saveRemote(userId, settings) {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from('household_settings')
      .upsert({ user_id: userId, settings, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[settings] Remote save failed:', e.message);
  }
}

export function useSettings(user) {
  const [settings,  setSettings]  = useState(loadLocal);
  const [synced,    setSynced]     = useState(false);
  const saveTimer = useRef(null);

  // On login — load remote settings, migrate local if first time
  useEffect(() => {
    if (!user?.id || !isSupabaseEnabled) {
      setSynced(true);
      return;
    }

    loadRemote(user.id).then(remote => {
      if (remote) {
        // Remote exists — use it
        setSettings(remote);
        saveLocal(remote);
        setSynced(true);
      } else {
        // First login — migrate localStorage up to Supabase
        const local = loadLocal();
        saveRemote(user.id, local);
        setSynced(true);
      }
    });
  }, [user?.id]);

  // Debounced save — writes to both localStorage and Supabase
  const update = useCallback((patch) => {
    setSettings(s => {
      const next = { ...s, ...patch };
      saveLocal(next);
      // Debounce remote save by 1.5s to avoid hammering on fast changes
      clearTimeout(saveTimer.current);
      if (user?.id) {
        saveTimer.current = setTimeout(() => saveRemote(user.id, next), 1500);
      }
      return next;
    });
  }, [user?.id]);

  const activeProfile = settings.profiles.find(p => p.id === settings.activeProfileId) || settings.profiles[0];

  const updateProfile = useCallback((profileId, patch) => {
    update({
      profiles: settings.profiles.map(p => p.id === profileId ? { ...p, ...patch } : p),
    });
  }, [settings.profiles, update]);

  const addProfile = useCallback((profile) => {
    update({
      profiles: [...settings.profiles, profile],
      activeProfileId: profile.id,
    });
  }, [settings.profiles, update]);

  const removeProfile = useCallback((profileId) => {
    update({
      profiles: settings.profiles.filter(p => p.id !== profileId),
      activeProfileId: settings.activeProfileId === profileId ? settings.profiles[0]?.id : settings.activeProfileId,
    });
  }, [settings.profiles, settings.activeProfileId, update]);

  const switchProfile = useCallback((profileId) => {
    update({ activeProfileId: profileId });
  }, [update]);

  return { settings, update, activeProfile, updateProfile, addProfile, removeProfile, switchProfile, synced };
}
