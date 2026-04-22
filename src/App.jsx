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
import { useCalendar }      from './hooks/useCalendar';
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

// ── Dev data source indicator ─────────────────────────────────────────────────
function DataBadge({ activitiesSource, weatherSource }) {
  const [expanded, setExpanded] = useState(false);
  const allLive = activitiesSource === 'live' && weatherSource === 'live';
  const allMock = activitiesSource === 'mock' && weatherSource === 'mock';
  const dot   = allLive ? '#22c55e' : allMock ? '#f59e0b' : '#60a5fa';
  const label = allLive ? 'live'    : allMock ? 'demo'    : 'partial';

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      style={{ position:'fixed', bottom:10, left:10, zIndex:90, cursor:'pointer', fontFamily:'DM Sans, sans-serif', userSelect:'none' }}
    >
      {!expanded && (
        <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(0,0,0,.7)', border:`0.5px solid ${dot}44`, borderRadius:99, padding:'4px 9px', backdropFilter:'blur(6px)' }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:dot, boxShadow:allLive?`0 0 6px ${dot}`:'none' }} />
          <span style={{ fontSize:10, color:'rgba(255,255,255,.5)', letterSpacing:'.06em', textTransform:'uppercase' }}>{label}</span>
        </div>
      )}
      {expanded && (
        <div style={{ background:'rgba(15,13,11,.95)', border:'0.5px solid rgba(255,255,255,.12)', borderRadius:10, padding:'10px 13px', minWidth:190, backdropFilter:'blur(10px)' }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:8 }}>Data sources</div>
          {[{label:'Activities', source:activitiesSource},{label:'Weather', source:weatherSource}].map(({label,source}) => {
            const c = source==='live'?'#22c55e':source==='mock'?'#f59e0b':'#94a3b8';
            const msg = source==='live'?'Live from backend':source==='mock'?'Demo — backend offline':source;
            return (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background:c, flexShrink:0 }} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,.5)', width:72 }}>{label}</span>
                <span style={{ fontSize:11, color:c }}>{msg}</span>
              </div>
            );
          })}
          <div style={{ fontSize:9, color:'rgba(255,255,255,.2)', marginTop:8, borderTop:'0.5px solid rgba(255,255,255,.07)', paddingTop:7 }}>
            Tap to collapse · {import.meta.env.VITE_API_URL||'localhost:3001'}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  // ── Auth-free: no login required, all local + optional Supabase sync ──
  const { settings, update, activeProfile, updateProfile, addProfile, removeProfile, switchProfile } = useSettings(null);

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

  // Google Calendar integration -- auth-free, uses stable deviceId
  const calendar = useCalendar(activeProfile);

  // Merge real Google Calendar events into calQueue for display in sidebar
  // Real events come back as Google Calendar event objects; normalize them
  // to the same shape calQueue uses: { title, date, time, added: true }
  useEffect(() => {
    if (!calendar.events?.length) return;
    const normalized = calendar.events.map(e => ({
      title: e.summary || e.title || 'Event',
      date:  e.start?.dateTime?.split('T')[0] || e.start?.date || '',
      time:  e.start?.dateTime
        ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        : 'All day',
      added:      true,
      fromGoogle: true,
      googleId:   e.id,
    }));
    // Keep locally-added items (fromGoogle=false), replace google ones
    setCalQueue(prev => [
      ...prev.filter(e => !e.fromGoogle),
      ...normalized,
    ]);
  }, [calendar.events]);

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

  // Calendar add — also tracks for post-event feedback
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

  // Feedback loop — thumbs up/down posts to backend and updates profile prefs
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
    calendar,
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

  // ── Onboarding — show on first launch ──
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

      {/* ── Data source indicator (dev helper) ── */}
      <DataBadge activitiesSource={activitiesSource} weatherSource={weatherSource} />
    </div>
  );
}
