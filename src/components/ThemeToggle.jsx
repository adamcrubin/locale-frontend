// ── ThemeToggle ───────────────────────────────────────────────────────────────
// Floating pill at the top of ActiveMode that lets you cycle through all 8
// themes. Shows the current theme name + emoji, with prev/next arrows.
// Clicking the label opens a full picker grid.
// Theme is persisted to localStorage so it survives reloads.

import { useState, useEffect } from 'react';
import { THEMES, applyTheme, getSavedThemeId } from '../data/themes';

export function useTheme() {
  const [themeId, setThemeId] = useState(getSavedThemeId);

  useEffect(() => {
    const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
    applyTheme(theme);
  }, [themeId]);

  const setTheme = (id) => setThemeId(id);
  const currentTheme = THEMES.find(t => t.id === themeId) || THEMES[0];
  return { themeId, setTheme, currentTheme };
}

export default function ThemeToggle({ themeId, setTheme, currentTheme }) {
  const [open, setOpen] = useState(false);
  const idx = THEMES.findIndex(t => t.id === themeId);

  const prev = () => setTheme(THEMES[(idx - 1 + THEMES.length) % THEMES.length].id);
  const next = () => setTheme(THEMES[(idx + 1) % THEMES.length].id);

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      {/* Compact pill */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0,
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.14)',
        borderRadius: 99, overflow: 'hidden',
        fontSize: 11, fontFamily: 'var(--font-body, DM Sans, sans-serif)',
      }}>
        <button onClick={prev} style={{
          padding: '4px 8px', background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 12, lineHeight: 1,
        }}>‹</button>
        <button onClick={() => setOpen(o => !o)} style={{
          padding: '4px 6px', background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.75)', cursor: 'pointer', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit',
        }}>
          <span>{currentTheme.emoji}</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.04em' }}>{currentTheme.label}</span>
        </button>
        <button onClick={next} style={{
          padding: '4px 8px', background: 'transparent', border: 'none',
          color: 'rgba(255,255,255,0.45)', cursor: 'pointer', fontSize: 12, lineHeight: 1,
        }}>›</button>
      </div>

      {/* Full picker grid */}
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
            background: '#1C1A17', border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: 12, width: 300,
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ gridColumn: '1/-1', fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', marginBottom: 4, paddingBottom: 6, borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
            Choose a theme
          </div>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              style={{
                display: 'flex', flexDirection: 'column', gap: 3,
                padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                textAlign: 'left', fontFamily: 'DM Sans, sans-serif',
                border: t.id === themeId
                  ? '1.5px solid rgba(201,168,76,0.6)'
                  : '0.5px solid rgba(255,255,255,0.08)',
                background: t.id === themeId
                  ? 'rgba(201,168,76,0.1)'
                  : 'rgba(255,255,255,0.03)',
                transition: 'all .12s',
              }}
              onMouseEnter={e => { if (t.id !== themeId) e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              onMouseLeave={e => { if (t.id !== themeId) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            >
              {/* Mini color swatch */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 2 }}>
                {[t.vars['--bg'], t.vars['--surface'], t.vars['--accent'], t.vars['--dark']].map((c, i) => (
                  <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c, border: '0.5px solid rgba(255,255,255,0.15)' }} />
                ))}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.id === themeId ? '#C9A84C' : 'rgba(255,255,255,0.8)' }}>
                {t.emoji} {t.label}
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.3 }}>
                {t.desc}
              </div>
            </button>
          ))}
          <div style={{ gridColumn: '1/-1', paddingTop: 6, borderTop: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setOpen(false)} style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
              Close ✕
            </button>
          </div>
        </div>
      )}

      {/* Backdrop to close picker */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  );
}
