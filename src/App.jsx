import { useState, useEffect, useRef } from 'react';
import AmbientMode          from './components/AmbientMode';
import ActiveMode           from './components/ActiveMode';
import WeekdayMode          from './components/WeekdayMode';
import WeatherScreen        from './components/WeatherScreen';
import CalendarModal        from './components/CalendarModal';
import SettingsScreen       from './components/SettingsScreen';
import ProfilePicker        from './components/ProfilePicker';
import SavedPage            from './components/SavedPage';
import OnboardingFlow       from './components/OnboardingFlow';
import PostEventFeedback    from './components/PostEventFeedback';
import { useSettings }      from './hooks/useSettings';
import { useActivities }    from './hooks/useActivities';
import { useWeekdayActivities } from './hooks/useWeekdayActivities';
import { useWeather }       from './hooks/useWeather';
import { usePhotos }        from './hooks/usePhotos';
import { usePostEventFeedback, trackForFeedback } from './hooks/usePostEventFeedback';
import { postFeedback }     from './lib/api';

// ── Loading splash ────────────────────────────────────────────────────────────
function LoadingSplash() {
  return (
    <div style={{
      width:'100vw', height:'100vh', background:'#0f0d0b',
      display:'flex', flexDirection:'column',
      alignItems:'center', justifyContent:'center', gap:14,
    }}>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:32, color:'rgba(255,255,255,.25)', fontWeight:300, letterSpacing:'.06em' }}>
        Locale
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width:6, height:6, borderRadius:'50%',
            background:'rgba(201,168,76,.4)',
            animation:`blink 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Reactive isMobile hook ────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

// ── Full Debug Panel ──────────────────────────────────────────────────────────
// Always visible in this build. Shows data sources, errors, and lets you
// fire raw API requests and copy the responses to paste back to Claude.
function DebugPanel({ activitiesSource, weatherSource, settings, activeProfile }) {
  const [open,       setOpen]       = useState(false);
  const [results,    setResults]    = useState({});
  const [loading,    setLoading]    = useState({});
  const [copied,     setCopied]     = useState(null);

  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

  const allLive = activitiesSource === 'live' && weatherSource === 'live';
  const allMock = activitiesSource === 'mock' && weatherSource === 'mock';
  const dot     = allLive ? '#22c55e' : allMock ? '#f59e0b' : '#60a5fa';
  const label   = allLive ? 'LIVE' : allMock ? 'DEMO' : 'PARTIAL';

  const fire = async (key, path) => {
    setLoading(l => ({ ...l, [key]: true }));
    const start = Date.now();
    try {
      const res  = await fetch(`${BASE}${path}`);
      const data = await res.json();
      setResults(r => ({ ...r, [key]: { ok: res.ok, status: res.status, ms: Date.now() - start, data } }));
    } catch (e) {
      setResults(r => ({ ...r, [key]: { ok: false, status: 0, ms: Date.now() - start, error: e.message } }));
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  };

  const copy = (key) => {
    const text = JSON.stringify(results[key], null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const city      = settings?.city || 'Falls Church, VA';
  const profileId = activeProfile?.id || 'default';
  const zip       = city.match(/\b(\d{5})\b/)?.[1] || '22046';

  const CHECKS = [
    { key: 'health',     label: '🟢 Health',      path: '/health' },
    { key: 'weather',    label: '🌤 Weather',      path: `/weather?city=${encodeURIComponent(city)}` },
    { key: 'events',     label: '📋 Events feed',  path: `/events?zip=${zip}&profileId=${profileId}&city=${encodeURIComponent(city)}` },
    { key: 'sources',    label: '🗂 Sources',      path: `/sources?zip=${zip}` },
    { key: 'scraped',    label: '🕷 Scraped',       path: `/admin/scraped?zip=${zip}` },
    { key: 'adminevents',label: '📌 DB events',    path: `/admin/events?zip=${zip}&limit=10` },
    { key: 'cache',      label: '⚡ Cache keys',   path: '/admin/cache' },
  ];

  const s = {
    panel: {
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      fontFamily: 'DM Sans, monospace', userSelect: 'none',
      maxHeight: open ? '80vh' : 'auto',
      display: 'flex', flexDirection: 'column',
    },
    pill: {
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(10,10,10,.92)', borderTop: `2px solid ${dot}`,
      padding: '8px 14px', cursor: 'pointer',
      backdropFilter: 'blur(10px)',
    },
    body: {
      background: 'rgba(10,10,10,.97)', overflowY: 'auto',
      borderTop: '0.5px solid rgba(255,255,255,.1)',
    },
    section: { padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,.08)' },
    h: { fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)', marginBottom: 8 },
    row: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 },
    btn: {
      fontSize: 11, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
      border: '0.5px solid rgba(255,255,255,.18)', background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.8)', fontFamily: 'DM Sans, sans-serif', flexShrink: 0,
    },
    srcRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 },
  };

  return (
    <div style={s.panel}>
      {/* ── Pill / header ── */}
      <div style={s.pill} onClick={() => setOpen(o => !o)}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot, boxShadow: `0 0 6px ${dot}88` }} />
        <span style={{ fontSize: 11, color: dot, fontWeight: 700, letterSpacing: '.06em' }}>{label}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', flex: 1 }}>
          {activitiesSource === 'mock' ? '  Backend offline -- tap to diagnose' : `  ${BASE}`}
        </span>
        <span style={{ fontSize: 14, color: 'rgba(255,255,255,.4)' }}>{open ? '▼' : '▲'}</span>
      </div>

      {open && (
        <div style={s.body}>
          {/* Data sources status */}
          <div style={s.section}>
            <div style={s.h}>Data sources</div>
            {[{ label: 'Activities', src: activitiesSource }, { label: 'Weather', src: weatherSource }].map(({ label, src }) => {
              const c = src === 'live' ? '#22c55e' : src === 'mock' ? '#f59e0b' : '#94a3b8';
              return (
                <div key={label} style={s.srcRow}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', width: 80 }}>{label}</span>
                  <span style={{ fontSize: 12, color: c, fontWeight: 600 }}>
                    {src === 'live' ? 'Live ✓' : src === 'mock' ? 'Mock -- backend not reached' : src}
                  </span>
                </div>
              );
            })}
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.25)', marginTop: 6 }}>
              API URL: {BASE}<br />
              City: {city} · Zip: {zip} · Profile: {profileId}
            </div>
          </div>

          {/* API checks */}
          <div style={s.section}>
            <div style={s.h}>API checks -- tap to fire, then copy &amp; paste to Claude</div>
            {CHECKS.map(({ key, label, path }) => {
              const res = results[key];
              const isLoading = loading[key];
              const c = !res ? 'rgba(255,255,255,.4)' : res.ok ? '#22c55e' : '#f87171';
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <div style={s.row}>
                    <button style={{ ...s.btn, opacity: isLoading ? 0.5 : 1 }}
                      onClick={() => fire(key, path)} disabled={isLoading}>
                      {isLoading ? '…' : label}
                    </button>
                    {res && (
                      <>
                        <span style={{ fontSize: 11, color: c }}>{res.ok ? '✓' : '✗'} {res.status} ({res.ms}ms)</span>
                        <button style={{ ...s.btn, background: copied === key ? 'rgba(34,197,94,.2)' : 'rgba(255,255,255,.06)', color: copied === key ? '#22c55e' : 'rgba(255,255,255,.6)', marginLeft: 'auto' }}
                          onClick={() => copy(key)}>
                          {copied === key ? 'Copied ✓' : '📋 Copy'}
                        </button>
                      </>
                    )}
                  </div>
                  {res && (
                    <pre style={{
                      fontSize: 10, color: res.ok ? 'rgba(255,255,255,.55)' : '#f87171',
                      background: 'rgba(255,255,255,.04)', borderRadius: 6, padding: '7px 10px',
                      overflowX: 'auto', maxHeight: 140, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    }}>
                      {JSON.stringify(res.error || res.data, null, 2).slice(0, 800)}
                      {JSON.stringify(res.error || res.data).length > 800 ? '\n… (truncated -- copy for full)' : ''}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>

          {/* Env / config */}
          <div style={{ ...s.section, borderBottom: 'none' }}>
            <div style={s.h}>Environment</div>
            <pre style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', margin: 0, whiteSpace: 'pre-wrap' }}>
{`VITE_API_URL:     ${import.meta.env.VITE_API_URL || '(not set -- using localhost:3001)'}
VITE_SUPABASE_URL: ${import.meta.env.VITE_SUPABASE_URL ? 'set' : '(not set)'}
Screen:           ${window.innerWidth}×${window.innerHeight}
User agent:       ${navigator.userAgent.slice(0, 80)}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  // ── Auth-free: no login required, all local + optional Supabase sync ──
  const { settings, update, activeProfile, updateProfile, addProfile, removeProfile, switchProfile } = useSettings(null);

  const isMobile = useIsMobile();

  // ── Live data hooks (fall back to mock if backend down) ──
  const { activities,         source: activitiesSource } = useActivities(settings.city, activeProfile);
  const { activities: weekdayActivities }                = useWeekdayActivities(settings.city, activeProfile);
  const { weather,            source: weatherSource    } = useWeather(settings.city);
  const { photos }                                       = usePhotos(settings.city);

  // ── Post-event feedback ──
  const { prompt: feedbackPrompt, respond: respondFeedback } = usePostEventFeedback(activeProfile?.id, settings.city);

  // ── Screen state ──
  const [screen,        setScreen]        = useState('ambient');
  const [weatherDay,    setWeatherDay]    = useState(null);
  const [calModal,      setCalModal]      = useState(null);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [showPicker,    setShowPicker]    = useState(false);
  const [showSaved,     setShowSaved]     = useState(false);
  const [calQueue,      setCalQueue]      = useState([]);
  const [transitioning, setTransitioning] = useState(false);

  const ambientEnteredAt = useRef(null);
  const idleTimer        = useRef(null);

  // Track ambient entry time for profile-picker threshold
  useEffect(() => {
    if (screen === 'ambient') ambientEnteredAt.current = Date.now();
  }, [screen]);

  // Auto-return to ambient after idle
  const resetIdleTimer = () => {
    clearTimeout(idleTimer.current);
    if (screen !== 'ambient') {
      const ms = (settings.ambientTimeoutMinutes || 10) * 60 * 1000;
      idleTimer.current = setTimeout(() => transitionTo('ambient'), ms);
    }
  };
  useEffect(() => {
    resetIdleTimer();
    return () => clearTimeout(idleTimer.current);
  }, [screen, settings.ambientTimeoutMinutes]);

  const transitionTo = (nextScreen) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => {
      setScreen(nextScreen);
      setTransitioning(false);
    }, 50);
  };

  const exitAmbient = () => {
    const inAmbientMs = Date.now() - (ambientEnteredAt.current || 0);
    const threshold   = (settings.ambientTimeoutMinutes || 10) * 60 * 1000;
    if (inAmbientMs > threshold && settings.profiles?.length > 1) {
      setShowPicker(true);
    } else {
      transitionTo('active');
    }
  };

  const onProfileSelected = (profileId) => {
    switchProfile(profileId);
    setShowPicker(false);
    transitionTo('active');
  };

  // Calendar add -- also tracks for post-event feedback
  const onAdded = (entry) => {
    setCalQueue(q => [...q, entry]);
    setCalModal(null);
    if (entry?.title) trackForFeedback(entry);
  };

  // Save item to profile
  const onSaveItem = (item) => {
    const current = activeProfile?.savedItems || [];
    if (!current.find(s => s.title === item.title)) {
      updateProfile(activeProfile.id, { savedItems: [...current, item] });
    }
  };

  const onRemoveSaved = (item) => {
    updateProfile(activeProfile.id, {
      savedItems: (activeProfile?.savedItems || []).filter(s => s.title !== item.title),
    });
  };

  // Feedback loop -- thumbs up/down posts to backend and updates profile prefs
  const onThumbUp = async (catId, act) => {
    // Post to backend
    if (act.id) {
      postFeedback(activeProfile?.id, act.id, act.content_type || 'event', 'up', settings.city)
        .catch(() => {});
    }
    // Also save to profile liked tags so future AI prompts know about it
    const likedTags = [...new Set([...(activeProfile?.likedTags || []), ...(act.tags || [])])];
    updateProfile(activeProfile.id, { likedTags });
  };

  const onThumbDown = async (catId, act) => {
    if (act.id) {
      postFeedback(activeProfile?.id, act.id, act.content_type || 'event', 'down', settings.city)
        .catch(() => {});
    }
    const dislikedTags = [...new Set([...(activeProfile?.dislikedTags || []), ...(act.tags || [])])];
    updateProfile(activeProfile.id, { dislikedTags });
  };

  // Common props passed to all screen components
  const commonProps = {
    settings,
    activeProfile,
    calQueue,
    activities,
    weather,
    activitiesSource,
    weatherSource,
    isMobile,
    onCalendar:      setCalModal,
    onWeather:       setWeatherDay,
    onSettings:      (patch) => patch && typeof patch === 'object' ? update(patch) : setSettingsOpen(true),
    onAmbient:       () => transitionTo('ambient'),
    onSwitchProfile: () => setShowPicker(true),
    onSaveItem,
    onRemoveSaved,
    onShowSaved:     () => setShowSaved(true),
    onThumbUp,
    onThumbDown,
  };

  // ── Onboarding -- show on first launch ──
  if (!settings.onboardingDone) {
    return (
      <OnboardingFlow
        showDemoButton={true}
        onComplete={(patch) => {
          update({ ...patch, onboardingDone: true });
        }}
      />
    );
  }

  return (
    <div
      style={{ width:'100vw', height:'100vh', overflow:'hidden', position:'relative', background:'#1C1A17' }}
      onPointerMove={resetIdleTimer}
      onPointerDown={resetIdleTimer}
    >
      {/* ── Screens ── */}
      {screen === 'ambient' && (
        <AmbientMode
          city={settings.city}
          weather={weather}
          activities={activities}
          photos={photos}
          calQueue={calQueue}
          activeProfile={activeProfile}
          settings={settings}
          onActivate={exitAmbient}
          onWeather={setWeatherDay}
        />
      )}

      {screen === 'active'  && <ActiveMode  {...commonProps} />}
      {screen === 'weekday' && <WeekdayMode {...commonProps} activities={weekdayActivities} />}

      {/* ── Weekend / Weeknight toggle ── */}
      {(screen === 'active' || screen === 'weekday') && (
        <div style={{
          position:'fixed', top:9, left:'50%', transform:'translateX(-50%)',
          zIndex:30, display:'flex',
          background:'rgba(255,255,255,.06)',
          border:'0.5px solid rgba(255,255,255,.12)',
          borderRadius:99, overflow:'hidden',
        }}>
          <button
            onClick={() => transitionTo('active')}
            style={{
              padding:'4px 16px', fontSize:11, fontWeight:500, cursor:'pointer',
              background: screen==='active' ? 'rgba(255,255,255,.15)' : 'transparent',
              color:      screen==='active' ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.4)',
              border:'none', fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}
          >Weekend</button>
          <button
            onClick={() => transitionTo('weekday')}
            style={{
              padding:'4px 16px', fontSize:11, fontWeight:500, cursor:'pointer',
              background: screen==='weekday' ? 'rgba(147,124,215,0.3)' : 'transparent',
              color:      screen==='weekday' ? '#C4B5FD' : 'rgba(255,255,255,.4)',
              border:'none', fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}
          >Weeknight</button>
        </div>
      )}

      {/* ── Overlays ── */}
      {weatherDay !== null && (
        <WeatherScreen
          initialDay={weatherDay}
          city={settings.city}
          weather={weather}
          onClose={() => setWeatherDay(null)}
        />
      )}

      {settingsOpen && (
        <SettingsScreen
          settings={settings}
          activeProfile={activeProfile}
          onSave={update}
          updateProfile={updateProfile}
          addProfile={addProfile}
          removeProfile={removeProfile}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {calModal && (
        <CalendarModal
          activity={calModal}
          gcalConnected={settings.gcalConnected}
          onClose={() => setCalModal(null)}
          onAdded={onAdded}
          profileId={activeProfile?.id}
        />
      )}

      {showPicker && (
        <ProfilePicker
          profiles={settings.profiles}
          activeId={settings.activeProfileId}
          onSelect={onProfileSelected}
          onClose={() => { setShowPicker(false); transitionTo('active'); }}
        />
      )}

      {showSaved && (
        <SavedPage
          savedItems={activeProfile?.savedItems || []}
          onCalendar={(act) => { setCalModal(act); setShowSaved(false); }}
          onRemove={onRemoveSaved}
          onClose={() => setShowSaved(false)}
        />
      )}

      {/* ── Post-event feedback toast ── */}
      <PostEventFeedback prompt={feedbackPrompt} onRespond={respondFeedback} />

      {/* ── Debug panel -- always visible during active development ── */}
      <DebugPanel
        activitiesSource={activitiesSource}
        weatherSource={weatherSource}
        settings={settings}
        activeProfile={activeProfile}
      />
    </div>
  );
}
