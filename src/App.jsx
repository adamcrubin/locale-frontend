import { useState, useEffect, useRef } from 'react';
import AmbientMode          from './components/AmbientMode';
import ActiveMode           from './components/ActiveMode';
import WeekdayMode          from './components/WeekdayMode';
import WeatherScreen        from './components/WeatherScreen';
import CalendarModal             from './components/CalendarModal';
import EditCalendarEventModal    from './components/EditCalendarEventModal';
import SettingsScreen       from './components/SettingsScreen';
import ProfilePicker        from './components/ProfilePicker';
import SourcesScreen        from './components/SourcesScreen';
import WelcomeScreen        from './components/WelcomeScreen';
import SavedPage            from './components/SavedPage';
import OnboardingFlow       from './components/OnboardingFlow';
import PostEventFeedback    from './components/PostEventFeedback';
import LoginPromptModal     from './components/LoginPromptModal';
import SendFeedback         from './components/SendFeedback';
import LoadingSplash, { hasSplashBeenShown, markSplashShown } from './components/LoadingSplash';
import FriendRequestsToast from './components/FriendRequestsToast';
import StaticPage from './components/StaticPage';
import FilterSheet from './components/FilterSheet';
import GuidedTour, { hasSeenTour, markTourSeen, resetTour } from './components/GuidedTour';
import { FunnelIcon } from './components/icons';
import { useAuth }          from './hooks/useAuth';
import { useSettings }      from './hooks/useSettings';
import { useActivities }    from './hooks/useActivities';
import { useWeekdayActivities } from './hooks/useWeekdayActivities';
import { useWeather }       from './hooks/useWeather';
import { useCalendar }      from './hooks/useCalendar';
import { usePhotos }        from './hooks/usePhotos';
import { usePostEventFeedback, trackForFeedback } from './hooks/usePostEventFeedback';
import { postFeedback }     from './lib/api';

// ── First-visit detection ─────────────────────────────────────────────────────
function hasVisitedBefore() {
  try { return localStorage.getItem('locale-visited') === 'true'; } catch { return false; }
}
function markVisited() {
  try { localStorage.setItem('locale-visited', 'true'); } catch {}
}

// (LoadingSplash now lives in ./components/LoadingSplash.jsx with the
//  branded wordmark + slideshow + rotating tagline per LOADING_UX.md.)

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

// ── ChipRow — multi-select pill row with an "Any" reset chip ──────────────
// `value` is an array of selected option ids. Empty array = Any.
// Clicking a specific chip toggles it and clears Any. Clicking Any clears all.
function ChipRow({ value, onChange, options, anyLabel = 'Any' }) {
  const isAny = !value || value.length === 0;
  const toggle = (id) => {
    const set = new Set(value || []);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange(Array.from(set));
  };
  const chipStyle = (active) => ({
    padding:'4px 10px', fontSize:11, cursor:'pointer', border:'none',
    fontFamily:'DM Sans, sans-serif', transition:'all .15s', whiteSpace:'nowrap',
    background: active ? 'rgba(255,255,255,.18)' : 'transparent',
    color:      active ? 'rgba(255,255,255,.9)'  : 'rgba(255,255,255,.4)',
    fontWeight: active ? 600 : 400,
  });
  return (
    <div style={{
      display:'flex', background:'rgba(255,255,255,.06)',
      border:'0.5px solid rgba(255,255,255,.12)', borderRadius:99, overflow:'hidden',
    }}>
      <button onClick={() => onChange([])} style={chipStyle(isAny)}>{anyLabel}</button>
      {options.map(o => (
        <button key={o.id} onClick={() => toggle(o.id)} style={chipStyle(!isAny && value.includes(o.id))}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function App() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { user, loading: authLoading, error: authError, signInWithGoogle, signOut, connectCalendar, hasCalendarScope, isEnabled: authEnabled } = useAuth();

  // ── Browse-without-account mode ────────────────────────────────────────────
  // Was originally "demo mode"; now framed as the default-no-account
  // browsing experience. State variable name kept to minimize churn.
  const [demoMode, setDemoMode] = useState(false);
  const [loginPrompt, setLoginPrompt] = useState(null); // null | { feature }
  const isDemo = !user && demoMode;
  const gate = (feature, fn) => (...args) => {
    if (isDemo) { setLoginPrompt({ feature }); return; }
    // Logged in but trying to use a calendar feature without the scope yet:
    // pop the same login modal but framed as "connect calendar". User clicks
    // the primary button → connectCalendar() runs the OAuth round-trip with
    // the calendar scope added.
    if (user && feature === 'calendar' && !hasCalendarScope) {
      setLoginPrompt({ feature: 'calendar', mode: 'calendar-connect' });
      return;
    }
    return fn?.(...args);
  };

  // ── First-visit flag ──────────────────────────────────────────────────────
  const [firstVisit] = useState(() => !hasVisitedBefore());

  // ── Settings (keyed to user.id when logged in, localStorage otherwise) ──
  const { settings, update, activeProfile, updateProfile, addProfile, removeProfile, switchProfile } = useSettings(user);

  // ── Guided tour ───────────────────────────────────────────────────────────
  // Fires once after a signed-in user lands on the active feed, only when
  // we haven't shown it before. Guests don't get the tour (they're being
  // pitched, not onboarded). Settings has a "Restart tour" button that
  // calls resetTour() → setTourOpen(true).
  // NOTE: must be declared AFTER useSettings — its dep array reads
  // settings.onboardingDone, which would otherwise hit the const TDZ.
  const [tourOpen, setTourOpen] = useState(false);
  useEffect(() => {
    if (!user) return;                        // signed-in only
    if (!settings.onboardingDone) return;     // wait until past onboarding
    if (hasSeenTour()) return;                // one-shot
    // Wait a beat so the feed paints + targets are mounted
    const t = setTimeout(() => setTourOpen(true), 700);
    return () => clearTimeout(t);
  }, [user, settings.onboardingDone]);

  // ── Profile select screen (shown after login when 2+ profiles exist) ──────
  const [showProfileSelect, setShowProfileSelect] = useState(false);

  // When user logs in, show profile select if multiple profiles
  useEffect(() => {
    if (user && settings.onboardingDone && settings.profiles?.length > 1) {
      // Only show if no profile was remembered on this device
      const remembered = (() => { try { return localStorage.getItem('locale-active-profile'); } catch { return null; } })();
      if (!remembered) setShowProfileSelect(true);
      else {
        const valid = settings.profiles.find(p => p.id === remembered);
        if (valid) switchProfile(remembered);
      }
    }
  }, [user?.id]);

  // Mark visited on first auth success or demo
  useEffect(() => {
    if ((user || demoMode) && firstVisit) markVisited();
  }, [user, demoMode]);

  // ── Screen state ──────────────────────────────────────────────────────────
  // (Declared BEFORE the data hooks so timeWindow is in scope when
  // useActivities reads it. Putting useActivities above this triggers a
  // temporal-dead-zone ReferenceError → blank screen.)
  const isMobileInit = typeof window !== 'undefined' && window.innerWidth < 768;
  // Land on active mode (the feed) regardless of device — ambient is a
  // screensaver, not a useful first impression. Idle timer still transitions
  // to ambient after inactivity.
  const [screen,        setScreen]        = useState('active');
  // Time window for the active feed: this-weekend (default) | next-weekend |
  // this-month. Weeknights still flips screen='weekday' so the existing
  // weeknight feed code path stays untouched. Persists in localStorage.
  const [timeWindow,    setTimeWindow]    = useState(() => {
    try { return localStorage.getItem('locale-time-window') || 'this-weekend'; }
    catch { return 'this-weekend'; }
  });
  useEffect(() => {
    try { localStorage.setItem('locale-time-window', timeWindow); } catch {}
  }, [timeWindow]);

  // ── Live data hooks ───────────────────────────────────────────────────────
  const locationOverride = settings.neighborhoodLat ? { lat: settings.neighborhoodLat, lng: settings.neighborhoodLng } : null;
  const { activities, loading: activitiesLoading, source: activitiesSource } = useActivities(settings.city, activeProfile, locationOverride, user, timeWindow);
  // Lazy-fetch — only hits the backend once the user actually opens
  // Weekday mode. Most sessions are weekend-only, so this saves a 60-event
  // payload per visit. Once loaded, the result is cached for the session.
  const { activities: weekdayActivities }                = useWeekdayActivities(settings.city, activeProfile, screen === 'weekday');
  // Prefer the user's selected neighborhood (has lat/lng) for weather —
  // backend uses those directly; city string is fallback.
  const { weather,            source: weatherSource    } = useWeather(settings.neighborhood || settings.city);
  const { photos }                                       = usePhotos(settings.city);

  const { prompt: feedbackPrompt, respond: respondFeedback } = usePostEventFeedback(activeProfile?.id, settings.city);

  const [weatherDay,    setWeatherDay]    = useState(null);
  const [calModal,      setCalModal]      = useState(null);
  const [settingsOpen,  setSettingsOpen]  = useState(false);
  const [showSources,   setShowSources]   = useState(false);
  // Which About/Terms/Privacy/etc. static page is open (null = none)
  const [staticPageId,  setStaticPageId]  = useState(null);
  const [showPicker,    setShowPicker]    = useState(false);
  const [showSaved,     setShowSaved]     = useState(false);
  const [calQueue,      setCalQueue]      = useState([]);
  // Multi-select filters. Empty array = "any" (show everything for that dimension).
  // Time values: 'morning' | 'midday' | 'night'
  // Price values: 'free' | '$' | '$$' | '$$$'
  const [timeFilters,   setTimeFilters]   = useState([]);
  const [priceFilters,  setPriceFilters]  = useState([]);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [editCalModal,  setEditCalModal]  = useState(null);
  const [transitioning, setTransitioning] = useState(false);

  const calendar = useCalendar(activeProfile, user);

  useEffect(() => {
    if (!calendar.events?.length) return;
    // Backend already normalizes events to { title, date, time } via getUpcomingEvents()
    const normalized = calendar.events.map(e => ({
      title:   e.title || e.summary || 'Event',
      date:    e.date  || e.start?.dateTime?.split('T')[0] || e.start?.date || '',
      time:    e.time  || null,
      endTime: e.endTime || null,
      added: true, fromGoogle: true, googleId: e.id,
    }));
    setCalQueue(prev => [...prev.filter(e => !e.fromGoogle), ...normalized]);
  }, [calendar.events]);

  const ambientEnteredAt = useRef(null);
  const idleTimer        = useRef(null);

  useEffect(() => {
    if (screen === 'ambient') ambientEnteredAt.current = Date.now();
  }, [screen]);

  // transitionTo MUST be declared before resetIdleTimer because the latter
  // references it inside a setTimeout closure. Lint rule no-use-before-define
  // catches this even though the timeout fires after render — same flavor of
  // TDZ-trap that's bitten us before.
  const transitionTo = (nextScreen) => {
    if (transitioning) return;
    setTransitioning(true);
    setTimeout(() => { setScreen(nextScreen); setTransitioning(false); }, 50);
  };

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
    if (profileId === '__add__') {
      setShowProfileSelect(false);
      setShowPicker(false);
      setSettingsOpen(true);
      return;
    }
    switchProfile(profileId);
    try { localStorage.setItem('locale-active-profile', profileId); } catch {}
    setShowProfileSelect(false);
    setShowPicker(false);
    transitionTo('active');
  };

  const onAdded = (entry) => {
    setCalQueue(q => [...q, entry]);
    setCalModal(null);
    if (entry?.title) trackForFeedback(entry);
  };

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

  const onThumbUp = async (catId, act) => {
    if (act.id) postFeedback(activeProfile?.id, act.id, act.content_type || 'event', 'up', settings.city).catch(() => {});
    const likedTags = [...new Set([...(activeProfile?.likedTags || []), ...(act.tags || [])])];
    updateProfile(activeProfile.id, { likedTags });
  };

  const onThumbDown = async (catId, act) => {
    if (act.id) postFeedback(activeProfile?.id, act.id, act.content_type || 'event', 'down', settings.city).catch(() => {});
    const dislikedTags = [...new Set([...(activeProfile?.dislikedTags || []), ...(act.tags || [])])];
    updateProfile(activeProfile.id, { dislikedTags });
  };

  // Curated "category" = top 10 events across all real categories, sorted by score.
  // Keep source categories intact — curated is purely a virtual aggregator.
  const curatedActivities = (() => {
    const seen = new Set();
    const perCat = {};
    const MAX_PER_CAT = 2;
    const MAX_TOTAL = 10;
    const flat = Object.entries(activities || {})
      .filter(([k]) => k !== 'curated')
      .flatMap(([catId, arr]) => Array.isArray(arr) ? arr.map(a => ({ ...a, _sourceCat: catId })) : [])
      .filter(a => a && a.title)
      .sort((a, b) => ((b.final_score || b.base_score || 0) + (b.expires ? 0.2 : 0))
                    - ((a.final_score || a.base_score || 0) + (a.expires ? 0.2 : 0)));
    const out = [];
    for (const a of flat) {
      const k = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,40);
      if (seen.has(k)) continue;
      const cat = a._sourceCat;
      if ((perCat[cat] || 0) >= MAX_PER_CAT) continue;
      seen.add(k);
      perCat[cat] = (perCat[cat] || 0) + 1;
      out.push(a);
      if (out.length >= MAX_TOTAL) break;
    }
    return out;
  })();
  const activitiesWithCurated = { curated: curatedActivities, ...(activities || {}) };

  const commonProps = {
    settings, activeProfile, calQueue, activities: activitiesWithCurated, weather,
    activitiesSource, weatherSource, calendar,
    onCalendar:      gate('calendar', setCalModal),
    onWeather:       setWeatherDay,
    onSettings:      gate('settings', (patch) => patch && typeof patch === 'object' ? update(patch) : setSettingsOpen(true)),
    onAmbient:       () => transitionTo('ambient'),
    onSwitchProfile: gate('profile', () => setShowPicker(true)),
    onSaveItem:      gate('save', onSaveItem),
    onRemoveSaved:   gate('save', onRemoveSaved),
    onShowSaved:     gate('saved', () => setShowSaved(true)),
    onThumbUp:       gate('thumbs', onThumbUp),
    onThumbDown:     gate('thumbs', onThumbDown),
    onEditCal:       gate('calendar', setEditCalModal),
    onLoginPrompt:   (feature) => setLoginPrompt({ feature: feature || 'default' }),
    isDemo,
    timeFilters,
    setTimeFilters,
    priceFilters,
    setPriceFilters,
    onOpenFilter: () => setFilterOpen(true),
    onShowPage: setStaticPageId,
    timeWindow,
    onSwitchTimeWindow: (w) => { transitionTo('active'); setTimeWindow(w); },
    user, onSignOut: signOut,
  };

  // ── Auth loading splash ───────────────────────────────────────────────────
  if (authLoading && !demoMode) return <LoadingSplash />;

  // ── Cold-start feed splash ────────────────────────────────────────────────
  // Shown once per session when: (a) we have no cache (source='mock'), and
  // (b) the first feed fetch is still in flight. Prevents the "mock→live"
  // content jolt that rattles the whole layout.
  if (activitiesSource === 'mock' && activitiesLoading && !hasSplashBeenShown() && !isDemo) {
    return <LoadingSplash />;
  }
  // Mark shown once real data arrives so subsequent navigation doesn't re-splash.
  if ((activitiesSource === 'live' || activitiesSource === 'cached') && !hasSplashBeenShown()) {
    markSplashShown();
  }

  // ── Welcome screen ────────────────────────────────────────────────────────
  // Show when: no user logged in AND not in demo mode AND onboarding is done
  // (if onboarding not done, new user flow handles that after sign-in)
  // When Supabase isn't configured, the Google button shows an error message
  // explaining what env vars are needed — useful during development.
  const showWelcome = !user && !demoMode;
  if (showWelcome) {
    return (
      <>
        <WelcomeScreen
          onGoogleSignIn={signInWithGoogle}
          onDemo={() => { setDemoMode(true); markVisited(); }}
          loading={authLoading}
          error={authError || (!authEnabled ? 'Auth not configured — add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Netlify environment variables, then redeploy.' : null)}
          onShowPage={setStaticPageId}
        />
        {staticPageId && <StaticPage pageId={staticPageId} onClose={() => setStaticPageId(null)} />}
      </>
    );
  }

  // ── Onboarding (new user, post-login) ─────────────────────────────────────
  if (!settings.onboardingDone) {
    return (
      <OnboardingFlow
        showDemoButton={false}
        onComplete={(patch) => update({ ...patch, onboardingDone: true })}
      />
    );
  }

  // ── Profile select (post-login, multi-profile) ────────────────────────────
  if (showProfileSelect) {
    return (
      <ProfileSelectScreen
        profiles={settings.profiles}
        user={user}
        onSelect={onProfileSelected}
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

      {/* ── Top-bar controls (desktop only) ───────────────────────────────
          One fixed-positioned flex container holds BOTH the filter chips and
          the Weekend/Weeknight toggle so they can't overlap each other.
          - left:320 clears the Locale wordmark + city dropdown on the left
          - right:230 reserves room for profile pill + heart + gear on the right
          - flex-wrap lets the Weekend toggle drop to a second row if chips
            grow wide enough that everything can't fit on one line
          - toggle uses `marginLeft:auto` so it sits against the right edge of
            the container with filters left-aligned */}
      {(screen === 'active' || screen === 'weekday') && !isMobileInit && (
        <div style={{
          // right-clearance was 230 but the header cluster grew (ⓘ menu,
          // pipeline status pill, profile pill, ♥, ⚙, Ambient, Ask). The
          // pipeline status pill alone is ~140px when active. Bumped to
          // 540 to reliably clear it. flexWrap lets the toggle drop to a
          // second row on narrower laptops if everything still doesn't fit.
          position:'fixed', top:9, left:320, right:540,
          zIndex:30, display:'flex', alignItems:'center',
          gap:12, flexWrap:'wrap',
        }}>
          {screen === 'active' && (
            <button onClick={() => setFilterOpen(true)} title="Filters" data-tour="filter" style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'4px 12px', fontSize:11, fontWeight:600, cursor:'pointer',
              background: (timeFilters.length + priceFilters.length) > 0 ? 'rgba(201,168,76,.22)' : 'rgba(255,255,255,.06)',
              border:'0.5px solid ' + ((timeFilters.length + priceFilters.length) > 0 ? 'rgba(201,168,76,.45)' : 'rgba(255,255,255,.12)'),
              borderRadius:99,
              color: (timeFilters.length + priceFilters.length) > 0 ? '#C9A84C' : 'rgba(255,255,255,.7)',
              fontFamily:'DM Sans, sans-serif',
            }}>
              <FunnelIcon size={11} /> Filter{(timeFilters.length + priceFilters.length) > 0 ? ` · ${timeFilters.length + priceFilters.length}` : ''}
            </button>
          )}

          {/* Planner: time-window pills — pushed to right edge.
              4 windows: this-weekend | next-weekend | weeknights | this-month.
              Each pill shows a compact label + mm/dd range tooltip. */}
          {(() => {
            const fmt = d => `${d.getMonth()+1}/${d.getDate()}`;
            const today = new Date();
            const dow = today.getDay();
            const thisFri = new Date(today); thisFri.setDate(today.getDate() + ((5 - dow + 7) % 7));
            const thisSun = new Date(thisFri); thisSun.setDate(thisFri.getDate() + 2);
            const nextFri = new Date(thisFri); nextFri.setDate(thisFri.getDate() + 7);
            const nextSun = new Date(nextFri); nextSun.setDate(nextFri.getDate() + 2);
            const monthName = today.toLocaleDateString('en-US', { month: 'short' });
            const windows = [
              { id: 'this-weekend', label: 'This weekend', range: `${fmt(thisFri)}–${fmt(thisSun)}` },
              { id: 'next-weekend', label: 'Next weekend', range: `${fmt(nextFri)}–${fmt(nextSun)}` },
              { id: 'weeknights',   label: 'Weeknights',   range: 'Mon–Thu' },
              { id: 'this-month',   label: monthName,      range: 'all month' },
            ];
            const goTo = (id) => {
              if (id === 'weeknights') transitionTo('weekday');
              else { transitionTo('active'); setTimeWindow(id); }
            };
            const activeId = screen === 'weekday' ? 'weeknights' : timeWindow;
            return (
              <div style={{
                display:'flex', background:'rgba(255,255,255,.06)',
                border:'0.5px solid rgba(255,255,255,.12)', borderRadius:99, overflow:'hidden',
                marginLeft:'auto', flexShrink:0,
              }}>
                {windows.map(w => {
                  const isActive = w.id === activeId;
                  const accent = w.id === 'weeknights' ? '#C4B5FD'
                              : w.id === 'next-weekend' ? '#7DD3FC'
                              : w.id === 'this-month'   ? '#FBA74E'
                              : 'rgba(255,255,255,.9)';
                  const accentBg = w.id === 'weeknights' ? 'rgba(147,124,215,0.3)'
                                : w.id === 'next-weekend' ? 'rgba(56,189,248,0.22)'
                                : w.id === 'this-month'   ? 'rgba(251,167,78,0.22)'
                                : 'rgba(255,255,255,.15)';
                  return (
                    <button key={w.id}
                      onClick={() => goTo(w.id)}
                      title={`${w.label} · ${w.range}`}
                      style={{
                        padding:'4px 12px', fontSize:11, fontWeight:500, cursor:'pointer',
                        background: isActive ? accentBg : 'transparent',
                        color:      isActive ? accent : 'rgba(255,255,255,.4)',
                        border:'none', fontFamily:'DM Sans, sans-serif', transition:'all .15s',
                        display:'flex', flexDirection:'column', alignItems:'center', lineHeight:1.1,
                      }}>
                      <span>{w.label}</span>
                      <span style={{ fontSize:8, opacity:.7, fontWeight:400, marginTop:1 }}>{w.range}</span>
                    </button>
                  );
                })}
              </div>
            );
          })()}
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

      {showSources && (
        <SourcesScreen user={user} settings={settings} onClose={() => setShowSources(false)} />
      )}

      {staticPageId && (
        <StaticPage pageId={staticPageId} onClose={() => setStaticPageId(null)} />
      )}

      {/* Unified filter sheet — desktop button + mobile header button both open this */}
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        timeFilters={timeFilters}
        setTimeFilters={setTimeFilters}
        priceFilters={priceFilters}
        setPriceFilters={setPriceFilters}
        activeProfile={activeProfile}
        updateProfile={updateProfile}
      />


      {/* Friend-request toast — auto-hides after first dismiss per session */}
      {user && screen === 'active' && !settingsOpen && (
        <FriendRequestsToast user={user} onOpenSettings={() => setSettingsOpen(true)} />
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
          user={user}
          onSignOut={signOut}
          onShowSources={() => setShowSources(true)}
          onShowPage={setStaticPageId}
          calendar={calendar}
          onRestartTour={() => { resetTour(); setTourOpen(true); }}
        />
      )}

      {calModal && (
        <CalendarModal
          activity={calModal}
          gcalConnected={calendar.connected}
          userId={calendar.deviceId}
          onClose={() => setCalModal(null)}
          onAdded={onAdded}
          profileId={activeProfile?.id}
        />
      )}

      {editCalModal && (
        <EditCalendarEventModal
          event={editCalModal}
          userId={calendar.deviceId}
          profileId={activeProfile?.id || 'default'}
          onClose={() => setEditCalModal(null)}
          onSaved={(updated) => setCalQueue(q => q.map(e => e.googleId === updated.googleId ? { ...e, ...updated } : e))}
          onDeleted={(id) => setCalQueue(q => q.filter(e => e.googleId !== id))}
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

      {/* ── Post-event feedback toast ──
          Suppressed on ambient (it's a clock/photo screen — interrupting it
          with a feedback ask is jarring) and during onboarding/welcome flows. */}
      {screen !== 'ambient' && (
        <PostEventFeedback prompt={feedbackPrompt} onRespond={respondFeedback} />
      )}

      {/* ── Floating Send Feedback button ──
          Free-text feedback drop. Hidden on ambient + during onboarding/welcome
          (those have their own primary CTAs and a feedback button competing
          would be noise). */}
      {screen !== 'ambient' && settings.onboardingDone && (
        <SendFeedback user={user} profileId={activeProfile?.id} />
      )}

      {/* ── Login / connect-calendar prompt ── */}
      <LoginPromptModal
        open={!!loginPrompt}
        feature={loginPrompt?.feature}
        mode={loginPrompt?.mode}
        onClose={() => setLoginPrompt(null)}
        onSignIn={() => {
          // Two flows through the same modal:
          //   - 'calendar-connect': user is signed in but the calendar scope
          //     wasn't granted yet. Trigger incremental scope.
          //   - everything else: standard sign-in (no calendar).
          const mode = loginPrompt?.mode;
          setLoginPrompt(null);
          if (mode === 'calendar-connect') connectCalendar?.();
          else signInWithGoogle?.();
        }}
      />

      {/* Guided tour — first-time signed-in users get a 5-7 step coachmark
          walkthrough. localStorage-gated; replay from Settings. */}
      <GuidedTour
        open={tourOpen}
        onClose={() => { markTourSeen(); setTourOpen(false); }}
        isMobile={isMobileInit}
      />
    </div>
  );
}
