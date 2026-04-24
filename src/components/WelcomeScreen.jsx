// ── WelcomeScreen.jsx ──────────────────────────────────────────────────────────
//
// Shown when:
//   (a) First visit to this browser (no locale-visited flag in localStorage)
//   (b) User is not authenticated
//
// Handles Google Sign-In via Supabase OAuth.
// "Remember me on this device" stores a flag so returning users skip this screen.

import { useState } from 'react';

const SELLING_POINTS = [
  { icon: '🗺️', title: 'Hyper-local',      desc: 'Real events scraped weekly from 17+ DC/NoVA sources' },
  { icon: '🎯', title: 'Personalized',     desc: 'Activities scored to your preferences, budget, and vibe' },
  { icon: '📅', title: 'Calendar-aware',   desc: 'Syncs with Google Calendar to flag conflicts automatically' },
  { icon: '🖼️', title: 'Ambient display',  desc: 'Designed for iPad wall-mount — always-on weekend planner' },
];

// Quiet text-link footer with the site-map pages. Shown on both mobile +
// desktop variants so unsigned-in visitors can read ToS / Privacy / etc.
function InfoFooter({ onShowPage }) {
  if (!onShowPage) return null;
  const links = [
    ['About',     'about'],
    ['Business',  'business'],
    ['Advertise', 'advertise'],
    ['Terms',     'terms'],
    ['Privacy',   'privacy'],
    ['Trust',     'trust'],
    ['Support',   'support'],
  ];
  return (
    <div style={{
      fontSize: 11, color: 'rgba(255,255,255,.3)',
      display: 'flex', flexWrap: 'wrap', gap: '4px 10px',
      justifyContent: 'center', lineHeight: 1.6,
    }}>
      {links.map(([label, id], i) => (
        <span key={id} style={{ display:'flex', alignItems:'center', gap:'4px 10px' }}>
          <button onClick={() => onShowPage(id)} style={{
            background:'none', border:'none', padding:0, cursor:'pointer',
            color:'rgba(255,255,255,.45)', fontSize:11, fontFamily:'DM Sans, sans-serif',
          }}>{label}</button>
          {i < links.length - 1 && <span style={{ color:'rgba(255,255,255,.2)' }}>·</span>}
        </span>
      ))}
    </div>
  );
}

export default function WelcomeScreen({ onGoogleSignIn, onDemo, loading, error, onShowPage }) {
  const [rememberMe, setRememberMe] = useState(true);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const handleGoogleSignIn = () => {
    if (rememberMe) {
      try { localStorage.setItem('locale-remember-me', 'true'); } catch {}
    }
    onGoogleSignIn();
  };

  // ── Mobile: single-column compact layout ──
  if (isMobile) {
    return (
      <div style={{ position:'fixed', inset:0, background:'#0C0A08', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px', fontFamily:'DM Sans, sans-serif', overflow:'auto' }}>
        <div style={{ width:'100%', maxWidth:360 }}>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:36, fontWeight:300, color:'rgba(255,255,255,.95)', letterSpacing:'.06em', marginBottom:6 }}>Locale</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,.35)', marginBottom:28, lineHeight:1.5 }}>Your personal weekend planner for DC & Northern Virginia</div>

          {error && <div style={{ fontSize:12, color:'#FDA4AF', padding:'10px 14px', background:'rgba(159,18,57,.15)', borderRadius:10, border:'0.5px solid rgba(253,164,175,.2)', marginBottom:16, lineHeight:1.5 }}>{error}</div>}

          <button onClick={handleGoogleSignIn} disabled={loading} style={{ width:'100%', padding:'14px 20px', borderRadius:12, cursor: loading?'default':'pointer', background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.14)', color:'rgba(255,255,255,.85)', fontSize:14, fontWeight:500, display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16, fontFamily:'DM Sans, sans-serif' }}>
            {loading ? <>⟳ Connecting...</> : <><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>Continue with Google</>}
          </button>
          <button onClick={onDemo} style={{ width:'100%', padding:'12px 20px', borderRadius:12, cursor:'pointer', background:'transparent', border:'0.5px solid rgba(255,255,255,.1)', color:'rgba(255,255,255,.4)', fontSize:13, fontFamily:'DM Sans, sans-serif', marginBottom:20 }}>👀 See a demo first</button>

          <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
            {SELLING_POINTS.map(({ icon, title }) => (
              <div key={title} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'rgba(255,255,255,.35)' }}>
                <span>{icon}</span><span>{title}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '0.5px solid rgba(255,255,255,.06)' }}>
            <InfoFooter onShowPage={onShowPage} />
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0C0A08',
      display: 'flex',
      fontFamily: 'DM Sans, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Background texture */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 70% at 60% 20%, rgba(201,168,76,.07) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 10% 80%, rgba(201,168,76,.04) 0%, transparent 50%)',
      }} />

      {/* ── Left panel: branding + selling points ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 64px',
        borderRight: '0.5px solid rgba(255,255,255,.06)',
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            fontFamily: 'Cormorant Garamond, serif',
            fontSize: 48, fontWeight: 300,
            color: 'rgba(255,255,255,.95)',
            letterSpacing: '.06em',
            lineHeight: 1,
            marginBottom: 10,
          }}>Locale</div>
          <div style={{
            fontSize: 15, color: 'rgba(255,255,255,.35)',
            letterSpacing: '.04em', lineHeight: 1.5,
          }}>
            Your personal weekend discovery app<br />
            for Washington DC &amp; Northern Virginia
          </div>
        </div>

        {/* Selling points */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {SELLING_POINTS.map(({ icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(201,168,76,.1)',
                border: '0.5px solid rgba(201,168,76,.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>{icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.8)', marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', lineHeight: 1.5 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div style={{ marginTop: 48, fontSize: 11, color: 'rgba(255,255,255,.18)' }}>
          Free to use · Falls Church, VA &amp; DC Metro · Updated weekly
        </div>

        {/* Site-map footer — small text links to static pages */}
        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '0.5px solid rgba(255,255,255,.05)' }}>
          <InfoFooter onShowPage={onShowPage} />
        </div>
      </div>

      {/* ── Right panel: auth ── */}
      <div style={{
        width: 420, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 48px',
        position: 'relative',
      }}>
        <div style={{
          fontFamily: 'Cormorant Garamond, serif',
          fontSize: 28, fontWeight: 300,
          color: 'rgba(255,255,255,.9)',
          marginBottom: 8, lineHeight: 1.2,
        }}>Welcome</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', marginBottom: 36, lineHeight: 1.6 }}>
          Sign in with Google to access your personalized weekend dashboard.
        </div>

        {/* Error */}
        {error && (
          <div style={{
            fontSize: 12, color: '#FDA4AF',
            padding: '10px 14px',
            background: 'rgba(159,18,57,.15)',
            borderRadius: 10,
            border: '0.5px solid rgba(253,164,175,.2)',
            marginBottom: 16, lineHeight: 1.5,
          }}>{error}</div>
        )}

        {/* Google Sign-In button */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 20px',
            borderRadius: 12, cursor: loading ? 'default' : 'pointer',
            background: loading ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.06)',
            border: '0.5px solid rgba(255,255,255,.14)',
            color: 'rgba(255,255,255,.85)',
            fontSize: 14, fontWeight: 500,
            fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all .15s',
            opacity: loading ? 0.6 : 1,
          }}
          onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.22)'; }}}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.14)'; }}
        >
          {loading ? (
            <>
              <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.2)', borderTopColor: '#C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Connecting...
            </>
          ) : (
            <>
              {/* Google G */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </>
          )}
        </button>

        {/* Remember me */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16, cursor: 'pointer' }}
          onClick={() => setRememberMe(r => !r)}>
          <div style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            border: `1.5px solid ${rememberMe ? '#C9A84C' : 'rgba(255,255,255,.2)'}`,
            background: rememberMe ? 'rgba(201,168,76,.2)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}>
            {rememberMe && <span style={{ fontSize: 11, color: '#C9A84C' }}>✓</span>}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', userSelect: 'none' }}>
            Remember me on this device
          </span>
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,.08)' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.2)' }}>or</span>
          <div style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,.08)' }} />
        </div>

        {/* Demo button */}
        <button
          onClick={onDemo}
          style={{
            width: '100%', padding: '12px 20px',
            borderRadius: 12, cursor: 'pointer',
            background: 'transparent',
            border: '0.5px solid rgba(255,255,255,.1)',
            color: 'rgba(255,255,255,.35)',
            fontSize: 13, fontFamily: 'DM Sans, sans-serif',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,.6)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.35)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; }}
        >
          👀 See a demo first
        </button>

        <div style={{ marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,.15)', lineHeight: 1.6 }}>
          By signing in you agree that this app is for personal use.<br />
          Your data is stored securely and never sold.
        </div>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
