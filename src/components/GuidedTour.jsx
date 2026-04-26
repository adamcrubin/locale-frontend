// ── GuidedTour.jsx ─────────────────────────────────────────────────────────
//
// First-time-user coachmark sequence. Auto-fires once after sign-in.
// User can skip at any time; finishing or skipping marks it done in
// localStorage. "Restart tour" lives in Settings for retrigger.
//
// Each step:
//   - Optional CSS selector to spotlight (cutout in the dim layer)
//   - Optional preferred placement (top|bottom|left|right|center)
//   - Title + body copy
//   - Auto-falls-back to centered modal when the target isn't on screen
//
// We re-measure on window resize and step change. No external deps.

import { useEffect, useState, useLayoutEffect } from 'react';

export const TOUR_STORAGE_KEY = 'locale-tour-completed';

export function hasSeenTour() {
  try { return localStorage.getItem(TOUR_STORAGE_KEY) === 'true'; }
  catch { return false; }
}
export function markTourSeen() {
  try { localStorage.setItem(TOUR_STORAGE_KEY, 'true'); } catch {}
}
export function resetTour() {
  try { localStorage.removeItem(TOUR_STORAGE_KEY); } catch {}
}

// Step definitions. `target` is a CSS selector that, when matched, gets
// spotlighted with a cutout + tooltip. When no element matches, the step
// renders as a centered modal — useful for "Welcome" / "Done" intros.
const STEPS_DESKTOP = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Locale',
    body: 'Locale is a weekly hand-curated weekend feed for DC + NoVA. Let me show you around — should take 30 seconds.',
  },
  {
    id: 'categories',
    target: '[data-tour="categories"]',
    placement: 'bottom',
    title: 'Each column is a category',
    body: 'Outdoors, food, comedy, family, music, day trips… 19 lanes total. Curated leads — that\'s the editor\'s pick this weekend. Use the page arrows or swipe to see more columns.',
  },
  {
    id: 'spotlight',
    target: '[data-tour="spotlight"]',
    placement: 'right',
    title: 'Tap any card to expand',
    body: 'You\'ll see why it\'s worth going + an action row: 📅 add to calendar, 📍 directions, 🔗 official page, 👍/👎 to teach the feed your taste.',
  },
  {
    id: 'filter',
    target: '[data-tour="filter"]',
    placement: 'bottom',
    title: 'Filter and switch views',
    body: 'Filter by time of day, price, or hide categories you don\'t care about. Try the Compact / Standard / Magazine view modes too — they trade density for breathing room.',
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    placement: 'left',
    title: 'Your weekend at a glance',
    body: 'Top pick of the weekend, plus weather and your existing calendar plans on Fri/Sat/Sun. Conflicts get flagged on the cards automatically.',
  },
  {
    id: 'settings',
    target: '[data-tour="settings"]',
    placement: 'bottom',
    title: 'Make it yours',
    body: 'Tap ⚙ to set preferences, manage profiles, invite friends, and pick a theme. Locale learns from your 👍/👎 — the more you tap, the sharper the feed gets.',
  },
  {
    id: 'done',
    target: null,
    title: 'You\'re all set.',
    body: 'Have a great weekend. You can replay this tour anytime from Settings.',
    isFinal: true,
  },
];

const STEPS_MOBILE = [
  {
    id: 'welcome',
    target: null,
    title: 'Welcome to Locale',
    body: 'A weekly hand-curated weekend feed for DC + NoVA. Quick walkthrough — 30 seconds.',
  },
  {
    id: 'categories',
    target: '[data-tour="mobile-cat-header"]',
    placement: 'bottom',
    title: 'Swipe between categories',
    body: 'Each header is a category. Swipe left/right or tap the arrows to switch. Curated is the editor\'s top pick this weekend.',
  },
  {
    id: 'card',
    target: '[data-tour="categories"]',
    placement: 'top',
    title: 'Tap any card',
    body: 'Tap a card to see why it\'s worth going. Use 📅 to add to your calendar, 👍/👎 to teach the feed.',
  },
  {
    id: 'filter',
    target: '[data-tour="mobile-filter"]',
    placement: 'bottom',
    title: 'Filter the feed',
    body: 'Filter by time of day, price, or hide categories. The icon in the header opens the filter sheet.',
  },
  {
    id: 'settings',
    target: '[data-tour="settings"]',
    placement: 'bottom',
    title: 'Settings & profile',
    body: 'Tap ⚙ to set preferences, manage profiles, invite friends, and pick a theme.',
  },
  {
    id: 'done',
    target: null,
    title: 'You\'re all set.',
    body: 'Have a great weekend. You can replay this tour anytime from Settings.',
    isFinal: true,
  },
];

export default function GuidedTour({ open, onClose, isMobile }) {
  const steps = isMobile ? STEPS_MOBILE : STEPS_DESKTOP;
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const step = steps[stepIdx];

  // Measure target whenever step changes, on window resize, or when the
  // user scrolls/expands a card (which can move the target).
  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      if (!step?.target) { setRect(null); return; }
      const el = document.querySelector(step.target);
      if (!el) { setRect(null); return; }
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    // Re-measure shortly after step changes — the target may not have been
    // mounted at the moment we checked (especially after page nav).
    const t = setTimeout(measure, 80);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      clearTimeout(t);
    };
  }, [open, stepIdx, step?.target]);

  if (!open) return null;

  const next = () => {
    if (stepIdx < steps.length - 1) setStepIdx(i => i + 1);
    else { markTourSeen(); onClose?.(); }
  };
  const skip = () => { markTourSeen(); onClose?.(); };
  const back = () => setStepIdx(i => Math.max(0, i - 1));

  const PADDING = 8; // around spotlight cutout

  // Tooltip placement
  const TIP_W  = isMobile ? Math.min(320, window.innerWidth - 32) : 360;
  const TIP_H_EST = 220;
  const VP_W   = window.innerWidth;
  const VP_H   = window.innerHeight;

  let tipStyle;
  if (rect) {
    const place = step.placement || 'bottom';
    let top, left;
    if (place === 'bottom') {
      top  = rect.top + rect.height + PADDING + 12;
      left = rect.left + rect.width / 2 - TIP_W / 2;
    } else if (place === 'top') {
      top  = rect.top - PADDING - TIP_H_EST - 12;
      left = rect.left + rect.width / 2 - TIP_W / 2;
    } else if (place === 'left') {
      top  = rect.top + rect.height / 2 - TIP_H_EST / 2;
      left = rect.left - PADDING - TIP_W - 12;
    } else if (place === 'right') {
      top  = rect.top + rect.height / 2 - TIP_H_EST / 2;
      left = rect.left + rect.width + PADDING + 12;
    } else {
      top  = VP_H / 2 - TIP_H_EST / 2;
      left = VP_W / 2 - TIP_W / 2;
    }
    // Clamp into viewport
    top  = Math.max(16, Math.min(VP_H - TIP_H_EST - 16, top));
    left = Math.max(16, Math.min(VP_W - TIP_W - 16, left));
    tipStyle = { top, left, width: TIP_W };
  } else {
    // Centered fallback (welcome / done steps)
    tipStyle = {
      top: VP_H / 2 - 110, left: VP_W / 2 - TIP_W / 2, width: TIP_W,
    };
  }

  // Cutout: render 4 dark rects around the target so the target itself
  // stays visible and bright. When no target, full overlay.
  const cutout = rect ? (
    <>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: rect.top - PADDING, background: 'rgba(0,0,0,.72)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: rect.top - PADDING, left: 0, width: rect.left - PADDING, height: rect.height + PADDING * 2, background: 'rgba(0,0,0,.72)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: rect.top - PADDING, left: rect.left + rect.width + PADDING, right: 0, height: rect.height + PADDING * 2, background: 'rgba(0,0,0,.72)', zIndex: 9998 }} />
      <div style={{ position: 'fixed', top: rect.top + rect.height + PADDING, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,.72)', zIndex: 9998 }} />
      {/* Highlight ring around the spotlight */}
      <div style={{
        position: 'fixed',
        top: rect.top - PADDING, left: rect.left - PADDING,
        width: rect.width + PADDING * 2, height: rect.height + PADDING * 2,
        boxShadow: '0 0 0 2px #C9A84C, 0 0 0 6px rgba(201,168,76,.25), 0 0 30px rgba(201,168,76,.4)',
        borderRadius: 10, pointerEvents: 'none', zIndex: 9999,
        transition: 'top .25s, left .25s, width .25s, height .25s',
      }} />
    </>
  ) : (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(2px)', zIndex: 9998 }} />
  );

  return (
    <>
      {cutout}
      {/* Tooltip card */}
      <div style={{
        position: 'fixed', ...tipStyle,
        background: '#1C1A17', border: '0.5px solid rgba(201,168,76,.45)',
        borderRadius: 14, padding: '20px 22px',
        boxShadow: '0 16px 48px rgba(0,0,0,.5)',
        zIndex: 10000, fontFamily: 'DM Sans, sans-serif',
        animation: 'localeTourFade .25s ease-out',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase',
          color: 'rgba(201,168,76,.7)', marginBottom: 8,
        }}>Step {stepIdx + 1} of {steps.length}</div>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 400,
          color: 'rgba(255,255,255,.96)', marginBottom: 10, letterSpacing: '.01em', lineHeight: 1.2,
        }}>{step.title}</div>
        <div style={{
          fontSize: 13, color: 'rgba(255,255,255,.65)',
          lineHeight: 1.55, marginBottom: 18,
        }}>{step.body}</div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, marginBottom: 16 }}>
          {steps.map((_, i) => (
            <div key={i} style={{
              flex: i === stepIdx ? 2 : 1, height: 3, borderRadius: 2,
              background: i <= stepIdx ? '#C9A84C' : 'rgba(255,255,255,.12)',
              transition: 'flex .2s, background .2s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={skip} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,.4)', fontSize: 12,
            fontFamily: 'DM Sans, sans-serif', padding: '6px 0',
          }}>{step.isFinal ? '' : 'Skip tour'}</button>
          <div style={{ display: 'flex', gap: 8 }}>
            {stepIdx > 0 && !step.isFinal && (
              <button onClick={back} style={{
                padding: '8px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,.06)',
                border: '0.5px solid rgba(255,255,255,.14)',
                color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 500,
                cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              }}>Back</button>
            )}
            <button onClick={next} style={{
              padding: '8px 18px', borderRadius: 8,
              background: '#C9A84C', color: '#1C1A17', border: 'none',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
            }}>{step.isFinal ? 'Got it' : (stepIdx === steps.length - 2 ? 'Finish' : 'Next')}</button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes localeTourFade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
