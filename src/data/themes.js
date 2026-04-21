// ── Locale Theme System ───────────────────────────────────────────────────────
// 8 distinct visual themes. Each theme overrides CSS custom properties
// on :root so the entire app repaints without a React re-render storm.
// The theme object also carries JS-side values for things that can't be
// driven purely by CSS (e.g. font loading, borderRadius config).

export const THEMES = [
  // ── 1. Hearthside (default warm) ─────────────────────────────────────────
  {
    id:    'hearthside',
    label: 'Hearthside',
    emoji: '🕯',
    desc:  'Warm cream · Charcoal · Gold accents',
    fonts: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&display=swap',
    vars: {
      '--bg':           '#F4F1EB',
      '--bg2':          '#EDE9E0',
      '--surface':      '#FFFFFF',
      '--surface2':     '#F9F7F4',
      '--dark':         '#1C1A17',
      '--darker':       '#141210',
      '--header-bg':    '#1C1A17',
      '--header-bg2':   '#252220',
      '--border':       'rgba(0,0,0,0.09)',
      '--border-strong':'rgba(0,0,0,0.15)',
      '--text':         '#1C1A17',
      '--text2':        '#3A3530',
      '--muted':        '#8A8378',
      '--subtle':       '#B8B3AA',
      '--accent':       '#C9A84C',
      '--accent-bg':    'rgba(201,168,76,0.12)',
      '--accent-border':'rgba(201,168,76,0.3)',
      '--radius-card':  '8px',
      '--radius-pill':  '99px',
      '--radius-btn':   '8px',
      '--font-display': "'Cormorant Garamond', serif",
      '--font-body':    "'DM Sans', sans-serif",
      '--shadow-card':  '0 1px 3px rgba(0,0,0,0.06)',
      '--cat-header-style': 'warm',
    },
  },

  // ── 2. Midnight Editorial ─────────────────────────────────────────────────
  {
    id:    'midnight',
    label: 'Midnight',
    emoji: '🌑',
    desc:  'Full dark · Electric blue · Sharp edges',
    fonts: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=IBM+Plex+Mono:wght@400;500&display=swap',
    vars: {
      '--bg':           '#0A0A0F',
      '--bg2':          '#111118',
      '--surface':      '#16161E',
      '--surface2':     '#1E1E28',
      '--dark':         '#0A0A0F',
      '--darker':       '#050508',
      '--header-bg':    '#0A0A0F',
      '--header-bg2':   '#111118',
      '--border':       'rgba(255,255,255,0.08)',
      '--border-strong':'rgba(255,255,255,0.15)',
      '--text':         '#E8E8F0',
      '--text2':        '#A0A0B8',
      '--muted':        '#606078',
      '--subtle':       '#3A3A50',
      '--accent':       '#4FC3F7',
      '--accent-bg':    'rgba(79,195,247,0.1)',
      '--accent-border':'rgba(79,195,247,0.25)',
      '--radius-card':  '4px',
      '--radius-pill':  '4px',
      '--radius-btn':   '2px',
      '--font-display': "'Playfair Display', serif",
      '--font-body':    "'IBM Plex Mono', monospace",
      '--shadow-card':  '0 0 0 1px rgba(79,195,247,0.08)',
      '--cat-header-style': 'dark',
    },
  },

  // ── 3. Broadsheet ─────────────────────────────────────────────────────────
  {
    id:    'broadsheet',
    label: 'Broadsheet',
    emoji: '📰',
    desc:  'Newspaper · Black & white · Serif-heavy',
    fonts: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Source+Serif+4:wght@300;400;600&display=swap',
    vars: {
      '--bg':           '#F7F5F0',
      '--bg2':          '#EEEBe4',
      '--surface':      '#FFFFFF',
      '--surface2':     '#F7F5F0',
      '--dark':         '#111111',
      '--darker':       '#000000',
      '--header-bg':    '#111111',
      '--header-bg2':   '#222222',
      '--border':       'rgba(0,0,0,0.18)',
      '--border-strong':'rgba(0,0,0,0.4)',
      '--text':         '#111111',
      '--text2':        '#333333',
      '--muted':        '#777777',
      '--subtle':       '#AAAAAA',
      '--accent':       '#111111',
      '--accent-bg':    'rgba(0,0,0,0.06)',
      '--accent-border':'rgba(0,0,0,0.3)',
      '--radius-card':  '0px',
      '--radius-pill':  '0px',
      '--radius-btn':   '0px',
      '--font-display': "'Playfair Display', serif",
      '--font-body':    "'Source Serif 4', serif",
      '--shadow-card':  'none',
      '--cat-header-style': 'broadsheet',
    },
  },

  // ── 4. Botanica ───────────────────────────────────────────────────────────
  {
    id:    'botanica',
    label: 'Botanica',
    emoji: '🌿',
    desc:  'Sage greens · Natural textures · Rounded',
    fonts: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Nunito:wght@300;400;500;600&display=swap',
    vars: {
      '--bg':           '#F0F4EE',
      '--bg2':          '#E4EBE1',
      '--surface':      '#FAFCF9',
      '--surface2':     '#EEF3EC',
      '--dark':         '#2D3B2A',
      '--darker':       '#1A2418',
      '--header-bg':    '#2D3B2A',
      '--header-bg2':   '#3A4A36',
      '--border':       'rgba(45,59,42,0.1)',
      '--border-strong':'rgba(45,59,42,0.2)',
      '--text':         '#2D3B2A',
      '--text2':        '#4A5E46',
      '--muted':        '#7A9175',
      '--subtle':       '#A8BEA4',
      '--accent':       '#5B8A4A',
      '--accent-bg':    'rgba(91,138,74,0.12)',
      '--accent-border':'rgba(91,138,74,0.3)',
      '--radius-card':  '14px',
      '--radius-pill':  '99px',
      '--radius-btn':   '10px',
      '--font-display': "'Lora', serif",
      '--font-body':    "'Nunito', sans-serif",
      '--shadow-card':  '0 2px 8px rgba(45,59,42,0.08)',
      '--cat-header-style': 'botanica',
    },
  },

  // ── 5. Neon Diner ─────────────────────────────────────────────────────────
  {
    id:    'neon',
    label: 'Neon Diner',
    emoji: '🍔',
    desc:  'Deep navy · Hot pink · Retro rounded',
    fonts: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Righteous&display=swap',
    vars: {
      '--bg':           '#0D1117',
      '--bg2':          '#131920',
      '--surface':      '#1A2030',
      '--surface2':     '#1E2538',
      '--dark':         '#0D1117',
      '--darker':       '#060A0E',
      '--header-bg':    '#0D1117',
      '--header-bg2':   '#131920',
      '--border':       'rgba(255,255,255,0.07)',
      '--border-strong':'rgba(255,100,180,0.3)',
      '--text':         '#F0F4FF',
      '--text2':        '#8B9CC8',
      '--muted':        '#556080',
      '--subtle':       '#2E3650',
      '--accent':       '#FF4DA6',
      '--accent-bg':    'rgba(255,77,166,0.12)',
      '--accent-border':'rgba(255,77,166,0.3)',
      '--radius-card':  '12px',
      '--radius-pill':  '99px',
      '--radius-btn':   '12px',
      '--font-display': "'Righteous', cursive",
      '--font-body':    "'Space Grotesk', sans-serif",
      '--shadow-card':  '0 0 20px rgba(255,77,166,0.06)',
      '--cat-header-style': 'neon',
    },
  },

  // ── 6. Parchment ─────────────────────────────────────────────────────────
  {
    id:    'parchment',
    label: 'Parchment',
    emoji: '📜',
    desc:  'Aged paper · Deep burgundy · Hand-crafted',
    fonts: 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Crimson+Pro:wght@300;400;600&display=swap',
    vars: {
      '--bg':           '#F2EBD9',
      '--bg2':          '#E8DFC5',
      '--surface':      '#FBF6EC',
      '--surface2':     '#F2EBD9',
      '--dark':         '#2C1810',
      '--darker':       '#1A0E08',
      '--header-bg':    '#2C1810',
      '--header-bg2':   '#3D2218',
      '--border':       'rgba(44,24,16,0.12)',
      '--border-strong':'rgba(44,24,16,0.25)',
      '--text':         '#2C1810',
      '--text2':        '#4A2E22',
      '--muted':        '#8A6A5A',
      '--subtle':       '#B89A88',
      '--accent':       '#8B2635',
      '--accent-bg':    'rgba(139,38,53,0.1)',
      '--accent-border':'rgba(139,38,53,0.25)',
      '--radius-card':  '6px',
      '--radius-pill':  '3px',
      '--radius-btn':   '4px',
      '--font-display': "'Spectral', serif",
      '--font-body':    "'Crimson Pro', serif",
      '--shadow-card':  '0 1px 4px rgba(44,24,16,0.1)',
      '--cat-header-style': 'parchment',
    },
  },

  // ── 7. Bauhaus ────────────────────────────────────────────────────────────
  {
    id:    'bauhaus',
    label: 'Bauhaus',
    emoji: '⬛',
    desc:  'Pure white · Hard black · Geometric grid',
    fonts: 'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;700;900&family=Barlow:wght@300;400;500&display=swap',
    vars: {
      '--bg':           '#FFFFFF',
      '--bg2':          '#F5F5F5',
      '--surface':      '#FFFFFF',
      '--surface2':     '#F8F8F8',
      '--dark':         '#000000',
      '--darker':       '#000000',
      '--header-bg':    '#000000',
      '--header-bg2':   '#111111',
      '--border':       'rgba(0,0,0,0.12)',
      '--border-strong':'rgba(0,0,0,1)',
      '--text':         '#000000',
      '--text2':        '#333333',
      '--muted':        '#888888',
      '--subtle':       '#CCCCCC',
      '--accent':       '#FF3300',
      '--accent-bg':    'rgba(255,51,0,0.08)',
      '--accent-border':'rgba(255,51,0,0.4)',
      '--radius-card':  '0px',
      '--radius-pill':  '0px',
      '--radius-btn':   '0px',
      '--font-display': "'Big Shoulders Display', sans-serif",
      '--font-body':    "'Barlow', sans-serif",
      '--shadow-card':  'none',
      '--cat-header-style': 'bauhaus',
    },
  },

  // ── 8. Velvet ─────────────────────────────────────────────────────────────
  {
    id:    'velvet',
    label: 'Velvet',
    emoji: '🍷',
    desc:  'Deep plum · Champagne gold · Luxury soft',
    fonts: 'https://fonts.googleapis.com/css2?family=Cormorant+Upright:wght@300;400;500;600&family=Jost:wght@300;400;500&display=swap',
    vars: {
      '--bg':           '#1A0A2E',
      '--bg2':          '#220D3A',
      '--surface':      '#2A1245',
      '--surface2':     '#311550',
      '--dark':         '#1A0A2E',
      '--darker':       '#10061C',
      '--header-bg':    '#10061C',
      '--header-bg2':   '#1A0A2E',
      '--border':       'rgba(255,215,140,0.1)',
      '--border-strong':'rgba(255,215,140,0.2)',
      '--text':         '#F5E8D0',
      '--text2':        '#C8A878',
      '--muted':        '#7A5A88',
      '--subtle':       '#4A2A5A',
      '--accent':       '#FFD78C',
      '--accent-bg':    'rgba(255,215,140,0.1)',
      '--accent-border':'rgba(255,215,140,0.25)',
      '--radius-card':  '16px',
      '--radius-pill':  '99px',
      '--radius-btn':   '12px',
      '--font-display': "'Cormorant Upright', serif",
      '--font-body':    "'Jost', sans-serif",
      '--shadow-card':  '0 4px 24px rgba(0,0,0,0.3)',
      '--cat-header-style': 'velvet',
    },
  },
];

export const DEFAULT_THEME_ID = 'hearthside';

// Apply a theme by injecting CSS vars onto :root
export function applyTheme(theme) {
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));

  // Swap Google Fonts link if needed
  let link = document.getElementById('locale-theme-font');
  if (!link) {
    link = document.createElement('link');
    link.id = 'locale-theme-font';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  if (link.href !== theme.fonts) link.href = theme.fonts;

  // Store selection
  try { localStorage.setItem('locale-theme', theme.id); } catch (e) {}
}

export function getSavedThemeId() {
  try { return localStorage.getItem('locale-theme') || DEFAULT_THEME_ID; } catch (e) { return DEFAULT_THEME_ID; }
}
