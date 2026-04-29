// ── LoadingBanner.jsx ──────────────────────────────────────────────────
// Floating "still loading" banner shown when ActiveMode is rendered with
// cached or live data BUT a fresh fetch is in flight in the background.
//
// Companion to the LoadingSplash: the splash covers the cold-cache case
// (nothing real to show yet); this banner covers the warm-cache refresh
// case (data is on screen, but it might be stale).
//
// Mounted in App.jsx. Self-managing visibility — appears after `loading`
// has been true for at least 3s (avoid flicker on fast fetches), shows
// elapsed time + backend pipeline state when available, dismisses when
// loading flips false.

import { useEffect, useState } from 'react';
import { usePipelineStatus } from '../hooks/usePipelineStatus';

export default function LoadingBanner({ loading, source }) {
  const [show, setShow]           = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const { status: pipelineStatus } = usePipelineStatus();

  // Tick elapsed time while loading. Reset to 0 when loading turns off
  // so a quick second refresh doesn't reuse the prior counter.
  useEffect(() => {
    if (!loading) {
      setElapsedMs(0);
      setShow(false);
      return;
    }
    const start = Date.now();
    const t = setInterval(() => setElapsedMs(Date.now() - start), 250);
    // Wait 3s before showing the banner — most refreshes finish faster
    // than that, so flickering a banner on every quick fetch would be
    // noisier than helpful.
    const showTimer = setTimeout(() => setShow(true), 3000);
    return () => { clearInterval(t); clearTimeout(showTimer); };
  }, [loading]);

  if (!show) return null;

  const seconds = Math.round(elapsedMs / 1000);
  const message = (() => {
    if (pipelineStatus?.scraping) {
      const n = pipelineStatus.lastScrapeCount || 0;
      return n > 0
        ? `Refreshing — backend is scraping (${n} sources)…`
        : 'Refreshing — backend is scraping…';
    }
    if (pipelineStatus?.extracting) {
      const n = pipelineStatus.lastExtractCount || 0;
      return n > 0
        ? `Refreshing — extracting events (${n} so far)…`
        : 'Refreshing — extracting events…';
    }
    if (seconds < 10)  return 'Refreshing your feed…';
    if (seconds < 25)  return 'Still refreshing — backend may be waking up…';
    return 'Backend is slow — your cached events are still good to use.';
  })();

  // The "source" prop tells us whether the screen is showing live, cached,
  // or mock data. We tag the banner accordingly so the user knows what
  // they're looking at right now.
  const sourceTag = source === 'cached' ? 'Showing cached events'
                  : source === 'mock'   ? 'Showing placeholder events'
                  :                       null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 12px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        background: 'rgba(28, 26, 23, 0.92)',
        color: 'rgba(255,255,255,.92)',
        border: '0.5px solid rgba(201,168,76,.45)',
        borderRadius: 99,
        padding: '8px 16px',
        fontFamily: 'DM Sans, sans-serif',
        fontSize: 12,
        lineHeight: 1.3,
        boxShadow: '0 6px 20px rgba(0,0,0,.32)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        animation: 'bannerFade 280ms ease both',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        maxWidth: '92vw',
      }}
    >
      <span style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: '#C9A84C',
        animation: 'pulseDot 1.4s ease-in-out infinite',
      }} />
      <span>{message}</span>
      {sourceTag && (
        <span style={{
          fontSize: 10, color: 'rgba(255,255,255,.5)',
          letterSpacing: '.06em', textTransform: 'uppercase',
          paddingLeft: 8, borderLeft: '0.5px solid rgba(255,255,255,.18)',
        }}>{sourceTag}</span>
      )}
      <style>{`
        @keyframes bannerFade {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 0.4; transform: scale(0.85); }
          50%      { opacity: 1;   transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
