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

// Hand-picked Unsplash photo IDs — all in the "people enjoying an event" spirit.
// Served via Unsplash's direct image CDN; resize params keep them lightweight.
const PHOTOS = [
  'photo-1529156069898-49953e39b3ac', // friends laughing at a table
  'photo-1501281668745-f7f57925c3b4', // festival crowd at dusk
  'photo-1530103862676-de8c9debad1d', // concert / raised hands
  'photo-1515187029135-18ee286d815b', // dinner party
];
const bg = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&h=900&q=70`;

// Two separate streams:
//   PROGRESS_LINES rotate fast (1.4s) so you always feel work happening.
//   TIPS rotate slowly (5s) so users have a chance to actually read one.
// Rendering them on different rows means the tip stays put while the
// progress text underneath churns.
const PROGRESS_LINES = [
  'Curating a great weekend…',
  'Reading the local press so you don\'t have to…',
  'Cross-checking the weather…',
  'Ranking what\'s actually worth your weekend…',
  'Tuning picks to your neighborhood…',
  'Almost there — loading your picks…',
];

const TIPS = [
  '👍 Tap thumbs-up on events you like — your feed learns fast',
  '⚑ Filter by time, price, or category from the top bar',
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
  const [photoIdx, setPhotoIdx] = useState(0);
  const [progressIdx, setProgressIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));

  // Crossfade photos every 4s.
  useEffect(() => {
    const t = setInterval(() => setPhotoIdx(i => (i + 1) % PHOTOS.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Progress lines churn fast — keeps a sense of activity.
  useEffect(() => {
    const t = setInterval(() => setProgressIdx(i => (i + 1) % PROGRESS_LINES.length), 1400);
    return () => clearInterval(t);
  }, []);

  // Tips dwell — 5s gives users actual time to read.
  useEffect(() => {
    const t = setInterval(() => setTipIdx(i => (i + 1) % TIPS.length), 5000);
    return () => clearInterval(t);
  }, []);

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

        {/* Progress line — short, rotates quickly. */}
        <div style={{
          marginTop: 18, fontSize: 13,
          color: 'rgba(255,255,255,.55)',
          minHeight: 18,
          fontStyle: 'italic',
        }}
          key={`p-${progressIdx}`}
        >
          <span style={{ animation: 'fadeIn 350ms ease both' }}>{PROGRESS_LINES[progressIdx]}</span>
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
      </div>

      {/* Keyframes for the spinner bar. fadeIn is assumed to be global already. */}
      <style>{`
        @keyframes splashBar {
          0%   { left: -40%; }
          50%  { left: 60%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
