// ── LoadingSplash.jsx ─────────────────────────────────────────────────────────
// Full-screen branded splash shown on cold start (no cache, first fetch in flight).
//
// - Centered "Locale" wordmark
// - Spinner bar underneath
// - Rotating tagline (switches every 2.2s)
// - Slideshow strip of Unsplash photos behind the wordmark (4s crossfade)
//
// Per-session only: after the first successful feed load we set sessionStorage
// so that a tab refocus / in-app navigation won't re-trigger this. A fresh tab
// (new session) will see it again.

import { useEffect, useState } from 'react';
import { usePipelineStatus } from '../hooks/usePipelineStatus';

// Hand-picked Unsplash photo IDs — all in the "people enjoying an event" spirit.
// Served via Unsplash's direct image CDN; resize params keep them lightweight.
const PHOTOS = [
  'photo-1529156069898-49953e39b3ac', // friends laughing at a table
  'photo-1501281668745-f7f57925c3b4', // festival crowd at dusk
  'photo-1530103862676-de8c9debad1d', // concert / raised hands
  'photo-1515187029135-18ee286d815b', // dinner party
];
const bg = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&h=900&q=70`;

// Real progress stages, surfaced as a checklist. Each stage activates
// based on a combination of elapsed time AND real backend signals from
// /api/pipeline-status. This replaces the prior fake-rotating progress
// strings — users get to see what's actually happening, not a feel-good
// stream of placeholders.
//
// Stage transitions:
//   0  ✓ Reading your saved profile          (instant — Locale runs in browser)
//   1  ▸ Connecting to backend                (active 0-3s)
//   2  ▸ Loading this weekend's events        (active 3s+ until data arrives)
//   3  ▸ Personalizing for your taste         (post data, ~1s)
//   4  ✓ Ready                                (when source becomes live/cached)
//
// During stage 2, if backend pipelineStatus reports scraping/extracting,
// we substitute the real label (e.g. "Scraping 23/75 sources").

function stageState(elapsedMs, pipelineStatus) {
  if (elapsedMs < 1500) return 1;
  return 2;
}

const TIPS = [
  '👍 Tap thumbs-up on events you like — your feed learns fast',
  'Filter by time, price, or category from the top bar',
  '♥ Save events for later with the heart button',
  '📅 One tap adds any event to your Google Calendar',
  'Invite friends in Settings — their saves bubble up in your feed',
  'Click ⓘ on a card to see where the event came from',
];

export const SPLASH_SESSION_KEY = 'locale.splashShown';

export function markSplashShown() {
  try { sessionStorage.setItem(SPLASH_SESSION_KEY, '1'); } catch {}
}
export function hasSplashBeenShown() {
  try { return sessionStorage.getItem(SPLASH_SESSION_KEY) === '1'; } catch { return false; }
}

export default function LoadingSplash() {
  const [photoIdx, setPhotoIdx]     = useState(0);
  const [tipIdx, setTipIdx]         = useState(() => Math.floor(Math.random() * TIPS.length));
  const [elapsedMs, setElapsedMs]   = useState(0);
  const [coldStart, setColdStart]   = useState(false);
  const { status: pipelineStatus }  = usePipelineStatus();

  // Crossfade photos every 4s.
  useEffect(() => {
    const t = setInterval(() => setPhotoIdx(i => (i + 1) % PHOTOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Tips dwell — 5s gives users actual time to read.
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

  // Tick elapsed time so the checklist can advance + cold-start banner
  // can decide when to fade in. 250ms is plenty smooth for second-tick UI.
  useEffect(() => {
    const start = Date.now();
    const t = setInterval(() => setElapsedMs(Date.now() - start), 250);
    return () => clearInterval(t);
  }, []);

  // Cold-start banner after 12s. Render free-tier dynos sleep after 15min
  // idle and take 30-60s to wake. Without this, users assume the app is
  // broken or stuck. Acknowledging the wait makes it tolerable.
  useEffect(() => {
    const t = setTimeout(() => setColdStart(true), 12000);
    return () => clearTimeout(t);
  }, []);

  // Build the live checklist. Stage labels can include real backend state
  // from /api/pipeline-status when the pipeline is actually running.
  const activeStage = stageState(elapsedMs, pipelineStatus);
  const fetchLabel = (() => {
    if (pipelineStatus?.scraping) {
      const n = pipelineStatus.lastScrapeCount || 0;
      return n > 0
        ? `Backend is scraping (${n} sources fresh)…`
        : 'Backend is scraping fresh sources…';
    }
    if (pipelineStatus?.extracting) {
      const n = pipelineStatus.lastExtractCount || 0;
      return n > 0
        ? `Backend is extracting events (${n} so far)…`
        : 'Backend is extracting events…';
    }
    if (elapsedMs < 5000)  return 'Loading this weekend\'s events…';
    if (elapsedMs < 15000) return 'Still loading your events…';
    if (elapsedMs < 30000) return 'Backend is waking up — this can take a moment…';
    return 'Almost there, the cold start is the longest wait…';
  })();
  const checklist = [
    { id: 1, label: 'Reading your saved profile',         done: true,                  active: false },
    { id: 2, label: 'Connecting to backend',              done: activeStage > 1,       active: activeStage === 1 },
    { id: 3, label: fetchLabel,                           done: false,                 active: activeStage >= 2 },
    { id: 4, label: 'Personalizing for your taste',       done: false,                 active: false, pending: true },
    { id: 5, label: 'Building your weekend',              done: false,                 active: false, pending: true },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: '#1C1A17',
      overflow: 'hidden',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Crossfading photo layers */}
      {PHOTOS.map((id, i) => (
        <div key={id} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${bg(id)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: i === photoIdx ? 0.35 : 0,
          transition: 'opacity 1.2s ease-in-out',
          filter: 'blur(1px)',
        }} />
      ))}
      {/* Darken overlay for text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(28,26,23,.7) 0%, rgba(28,26,23,.85) 100%)',
      }} />

      {/* Centered stack */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: 24 }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 72, fontWeight: 300, letterSpacing: '.08em',
          color: 'rgba(255,255,255,.96)',
          lineHeight: 1,
        }}>
          Locale
        </div>
        <div style={{
          fontSize: 11, color: 'rgba(255,255,255,.35)',
          letterSpacing: '.18em', textTransform: 'uppercase',
          marginTop: 10,
        }}>
          your personal weekend planner
        </div>

        {/* Spinner bar */}
        <div style={{
          marginTop: 40, width: 240, height: 3,
          background: 'rgba(255,255,255,.08)',
          borderRadius: 99,
          overflow: 'hidden',
          position: 'relative',
          marginLeft: 'auto', marginRight: 'auto',
        }}>
          <div style={{
            position: 'absolute',
            left: 0, top: 0, height: '100%', width: '40%',
            background: '#C9A84C',
            borderRadius: 99,
            animation: 'splashBar 1.6s ease-in-out infinite',
          }} />
        </div>

        {/* Real progress checklist — stages light up as work advances.
            Replaces the old rotating fake-progress strings. */}
        <div style={{
          marginTop: 24, marginBottom: 4,
          display: 'inline-block', textAlign: 'left',
          minWidth: 280,
        }}>
          {checklist.map(item => {
            const icon = item.done   ? '✓'
                       : item.active ? '▸'
                       :                '·';
            const color = item.done   ? 'rgba(126,217,87,.95)'
                        : item.active ? '#C9A84C'
                        :                'rgba(255,255,255,.30)';
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'baseline', gap: 10,
                padding: '5px 0',
                fontSize: 13,
                color: item.pending ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.85)',
                animation: item.active ? 'pulseDim 1.6s ease-in-out infinite' : 'none',
              }}>
                <span style={{
                  display: 'inline-block', width: 14, textAlign: 'center',
                  color, fontWeight: item.done ? 600 : 400,
                }}>{icon}</span>
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>

        {/* Tip — separated, dwells longer so users can read. */}
        <div style={{
          marginTop: 28, padding: '10px 16px',
          maxWidth: 360, marginLeft:'auto', marginRight:'auto',
          fontSize: 12,
          color: 'rgba(255,255,255,.7)',
          background: 'rgba(255,255,255,.05)',
          border: '0.5px solid rgba(255,255,255,.10)',
          borderRadius: 10,
          minHeight: 36, lineHeight: 1.4,
        }}
          key={`t-${tipIdx}`}
        >
          <div style={{ fontSize:9, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(201,168,76,.7)', marginBottom:4 }}>Tip</div>
          <span style={{ animation: 'fadeIn 500ms ease both' }}>{TIPS[tipIdx]}</span>
        </div>

        {/* Cold-start acknowledgment — fades in after 12s */}
        {coldStart && (
          <div style={{
            marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,.45)',
            maxWidth: 320, marginLeft: 'auto', marginRight: 'auto',
            lineHeight: 1.5, animation: 'fadeIn 600ms ease both',
          }}>
            ☕ The backend's waking up — first load on a free server takes
            a moment. Subsequent visits are instant.
          </div>
        )}
      </div>

      {/* Keyframes for the spinner bar + checklist active-row pulse. */}
      <style>{`
        @keyframes splashBar {
          0%   { left: -40%; }
          50%  { left: 60%; }
          100% { left: 100%; }
        }
        @keyframes pulseDim {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
