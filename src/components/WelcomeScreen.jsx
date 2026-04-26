// ── WelcomeScreen.jsx ──────────────────────────────────────────────────────
//
// Landing/marketing page for new visitors. Two paths:
//   1. "Try it free, no account" → enters the app as a guest (5 events per
//      category, no relevancy scoring, "sign in to see more" CTAs)
//   2. "Sign in with Google" → bare-minimum-scope OAuth (no calendar). The
//      calendar scope gets requested on demand later.
//
// Shown when the user has no Supabase session AND hasn't already chosen
// to browse as a guest. Returning signed-in users skip this entirely.

import { useState } from 'react';

const SELLING_POINTS = [
  { icon: '🎯', title: 'Curated, not searched',
    desc: 'A weekly hand-pruned feed across 21 categories — concerts, restaurants, hikes, comedy, kid stuff, weekend trips, and more. No search box, no filter walls. Just scroll.' },
  { icon: '🗺️', title: 'Hyper-local to DC + NoVA',
    desc: 'Real events scraped weekly from 80+ local sources: Washingtonian, DCist, Eventbrite, every venue calendar from Wolf Trap to Pinstripes. Your weekend options, in one place.' },
  { icon: '✨', title: 'Smart picks, not noise',
    desc: 'Locale ranks events by your tastes, the weather, your neighborhood, and what your friends are interested in. Same feed for everyone? No. Same feed twice? Also no.' },
  { icon: '📅', title: 'Add to calendar in one tap',
    desc: 'Like an event? Tap 📅. It lands in your Google Calendar with venue, time, and address pre-filled. We only ask for calendar access when you actually use it.' },
];

const HOW_IT_WORKS = [
  { n: '1', title: 'Open Locale on Friday morning',  desc: 'No setup. The feed is already loaded with this weekend\'s best — concerts, food events, family activities, day trips.' },
  { n: '2', title: 'Skim, save, plan',                desc: 'Tap a card to see why it\'s worth going. Add it to your calendar with one click. Skip what doesn\'t fit; thumb-up what you love (your feed learns).' },
  { n: '3', title: 'Stop scrolling Instagram',        desc: 'Locale answers "what should we do this weekend?" in 30 seconds. Reclaim your Tuesday-night browser-tab spirals.' },
];

const FAQ = [
  { q: 'Do I need an account?',
    a: 'Nope — try it free without signing up. Sign in later if you want personalized rankings, friends, calendar sync, or saved events.' },
  { q: 'What does Google access give you?',
    a: 'Sign-in alone only confirms your email. We only request access to your calendar after you click "Add to calendar" — and even then it\'s scoped to creating events, not reading your existing schedule.' },
  { q: 'Where do the events come from?',
    a: 'We scrape 80+ DC-area sources weekly: editorial guides (Washingtonian, DCist), venue calendars (Kennedy Center, 9:30 Club, AFI Silver), and aggregators (Eventbrite). Real events, real links to real ticket pages.' },
  { q: 'How is this different from Eventbrite or Yelp?',
    a: 'Locale isn\'t a marketplace — it\'s curated. We hide low-signal events (in-store retail demos, virtual webinars), rank by what\'s actually worth your weekend, and present it in a feed that fits the screen.' },
  { q: 'Is it free?',
    a: 'Yes. No ads, no upsells.' },
];

function InfoFooter({ onShowPage }) {
  if (!onShowPage) return null;
  const links = [
    ['About',     'about'],
    ['Business',  'business'],
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

function GoogleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function CTAButtons({ onGuest, onGoogleSignIn, loading, layout = 'side' }) {
  const cols = layout === 'stack';
  return (
    <div style={{ display:'flex', flexDirection: cols ? 'column' : 'row', gap: 10, width:'100%' }}>
      <button
        onClick={onGuest}
        style={{
          flex: 1, padding: '13px 18px', borderRadius: 12, cursor: 'pointer',
          background: '#C9A84C', color: '#1C1A17', border: 'none',
          fontSize: 14, fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
          boxShadow: '0 4px 14px rgba(201,168,76,.25)',
          transition: 'transform .12s, box-shadow .12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(201,168,76,.35)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(201,168,76,.25)'; }}
      >Try it free →</button>
      <button
        onClick={onGoogleSignIn}
        disabled={loading}
        style={{
          flex: 1, padding: '13px 18px', borderRadius: 12,
          cursor: loading ? 'default' : 'pointer',
          background: 'rgba(255,255,255,.06)',
          border: '0.5px solid rgba(255,255,255,.18)',
          color: 'rgba(255,255,255,.85)',
          fontSize: 14, fontWeight: 500,
          fontFamily: 'DM Sans, sans-serif',
          display:'flex', alignItems:'center', justifyContent:'center', gap:9,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? <>⟳ Connecting…</> : <><GoogleIcon size={16} />Sign in with Google</>}
      </button>
    </div>
  );
}

export default function WelcomeScreen({ onGoogleSignIn, onDemo, loading, error, onShowPage }) {
  const [rememberMe, setRememberMe] = useState(true);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 720;

  const handleGoogleSignIn = () => {
    if (rememberMe) { try { localStorage.setItem('locale-remember-me', 'true'); } catch {} }
    onGoogleSignIn();
  };

  // ── Mobile: single column, scrolling ──
  if (isMobile) {
    return (
      <div style={{
        position:'fixed', inset:0, background:'#0C0A08', overflowY:'auto',
        fontFamily:'DM Sans, sans-serif',
      }}>
        <div style={{ maxWidth: 480, margin:'0 auto', padding:'40px 20px' }}>
          {/* Hero */}
          <div style={{ textAlign:'center', marginBottom: 28 }}>
            <div style={{
              fontFamily:'Cormorant Garamond, serif', fontSize: 44, fontWeight: 300,
              color:'rgba(255,255,255,.96)', letterSpacing:'.06em', marginBottom: 8,
            }}>Locale</div>
            <div style={{ fontSize: 14, color:'#C9A84C', fontWeight: 500, marginBottom: 14, letterSpacing:'.04em' }}>
              Your personal weekend planner
            </div>
            <div style={{ fontSize: 15, color:'rgba(255,255,255,.55)', lineHeight: 1.55 }}>
              Stop scrolling Instagram for ideas. Locale curates the best of DC + Northern Virginia each weekend — concerts, restaurants, hikes, family activities, day trips — all in one place.
            </div>
          </div>

          {error && (
            <div style={{
              fontSize:12, color:'#FDA4AF', padding:'10px 14px',
              background:'rgba(159,18,57,.15)', borderRadius:10,
              border:'0.5px solid rgba(253,164,175,.2)',
              marginBottom:16, lineHeight:1.5,
            }}>{error}</div>
          )}

          {/* Primary CTAs */}
          <CTAButtons onGuest={onDemo} onGoogleSignIn={handleGoogleSignIn} loading={loading} layout="stack" />
          <div style={{ fontSize: 11, color:'rgba(255,255,255,.4)', textAlign:'center', marginTop: 10, lineHeight: 1.5 }}>
            No account required to browse. Sign in for personalized rankings, saved events, and calendar sync.
          </div>

          {/* What you get */}
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(201,168,76,.7)', marginBottom: 16, textAlign:'center' }}>
              What Locale does
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 16 }}>
              {SELLING_POINTS.map(({ icon, title, desc }) => (
                <div key={title} style={{ display:'flex', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background:'rgba(201,168,76,.1)',
                    border:'0.5px solid rgba(201,168,76,.2)',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize: 16,
                  }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color:'rgba(255,255,255,.85)', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color:'rgba(255,255,255,.5)', lineHeight: 1.55 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(201,168,76,.7)', marginBottom: 16, textAlign:'center' }}>
              How it works
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
              {HOW_IT_WORKS.map(s => (
                <div key={s.n} style={{ display:'flex', gap: 12, alignItems:'flex-start' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background:'#C9A84C', color:'#1C1A17',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize: 13, fontWeight: 700,
                  }}>{s.n}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color:'rgba(255,255,255,.85)', marginBottom: 2 }}>{s.title}</div>
                    <div style={{ fontSize: 12, color:'rgba(255,255,255,.5)', lineHeight: 1.55 }}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginTop: 40 }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(201,168,76,.7)', marginBottom: 16, textAlign:'center' }}>
              Common questions
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
              {FAQ.map(({ q, a }) => (
                <div key={q}>
                  <div style={{ fontSize: 12, fontWeight: 600, color:'rgba(255,255,255,.85)', marginBottom: 4 }}>{q}</div>
                  <div style={{ fontSize: 12, color:'rgba(255,255,255,.5)', lineHeight: 1.55 }}>{a}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div style={{ marginTop: 40, padding: '24px 18px', borderRadius: 14,
            background:'linear-gradient(180deg, rgba(201,168,76,.08), rgba(201,168,76,.03))',
            border: '0.5px solid rgba(201,168,76,.2)',
            textAlign:'center',
          }}>
            <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize: 22, fontWeight: 400, color:'rgba(255,255,255,.92)', marginBottom: 6, letterSpacing:'.02em' }}>
              See your weekend
            </div>
            <div style={{ fontSize: 12, color:'rgba(255,255,255,.55)', marginBottom: 16 }}>
              No signup, no scroll. Just open and skim.
            </div>
            <CTAButtons onGuest={onDemo} onGoogleSignIn={handleGoogleSignIn} loading={loading} layout="stack" />
          </div>

          <div style={{ marginTop: 32, paddingTop: 16, borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
            <InfoFooter onShowPage={onShowPage} />
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Desktop: scrolling landing page ──
  return (
    <div style={{
      position:'fixed', inset:0, background:'#0C0A08', overflowY:'auto',
      fontFamily:'DM Sans, sans-serif',
    }}>
      {/* Background texture */}
      <div style={{
        position:'fixed', inset:0, pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(201,168,76,.08) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 10% 80%, rgba(201,168,76,.04) 0%, transparent 50%)',
      }} />

      <div style={{ maxWidth: 1100, margin:'0 auto', padding:'80px 48px 60px', position:'relative' }}>
        {/* Hero */}
        <div style={{ textAlign:'center', marginBottom: 44 }}>
          <div style={{
            fontFamily:'Cormorant Garamond, serif', fontSize: 72, fontWeight: 300,
            color:'rgba(255,255,255,.96)', letterSpacing:'.06em', marginBottom: 12,
            lineHeight: 1,
          }}>Locale</div>
          <div style={{ fontSize: 16, color:'#C9A84C', fontWeight: 500, marginBottom: 18, letterSpacing:'.06em', textTransform:'uppercase' }}>
            Your personal weekend planner
          </div>
          <div style={{ fontSize: 18, color:'rgba(255,255,255,.6)', lineHeight: 1.55, maxWidth: 600, margin:'0 auto' }}>
            Stop scrolling Instagram for ideas. Locale curates the best of <strong style={{ color:'rgba(255,255,255,.8)', fontWeight: 500 }}>DC + Northern Virginia</strong> each weekend — concerts, restaurants, hikes, family activities, day trips — all in one feed.
          </div>
        </div>

        {error && (
          <div style={{
            fontSize:13, color:'#FDA4AF', padding:'12px 16px',
            background:'rgba(159,18,57,.15)', borderRadius:10,
            border:'0.5px solid rgba(253,164,175,.2)',
            margin:'0 auto 20px', lineHeight:1.5, maxWidth: 560, textAlign:'center',
          }}>{error}</div>
        )}

        {/* Primary CTAs */}
        <div style={{ maxWidth: 560, margin:'0 auto' }}>
          <CTAButtons onGuest={onDemo} onGoogleSignIn={handleGoogleSignIn} loading={loading} />
          <div style={{ fontSize: 12, color:'rgba(255,255,255,.4)', textAlign:'center', marginTop: 12, lineHeight: 1.5 }}>
            <strong style={{ color:'rgba(255,255,255,.6)', fontWeight: 500 }}>No account required to browse.</strong> Sign in for personalized rankings, saved events, friend activity, and calendar sync.
          </div>
        </div>

        {/* Selling points grid */}
        <div style={{ marginTop: 80 }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(201,168,76,.7)', marginBottom: 32, textAlign:'center' }}>
            What Locale does
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 20 }}>
            {SELLING_POINTS.map(({ icon, title, desc }) => (
              <div key={title} style={{
                padding: 24, borderRadius: 14,
                background:'rgba(255,255,255,.025)',
                border:'0.5px solid rgba(255,255,255,.07)',
                display:'flex', gap: 14,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background:'rgba(201,168,76,.12)',
                  border:'0.5px solid rgba(201,168,76,.25)',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize: 20,
                }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color:'rgba(255,255,255,.9)', marginBottom: 6 }}>{title}</div>
                  <div style={{ fontSize: 13, color:'rgba(255,255,255,.55)', lineHeight: 1.55 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div style={{ marginTop: 80 }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(201,168,76,.7)', marginBottom: 32, textAlign:'center' }}>
            How it works
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 24 }}>
            {HOW_IT_WORKS.map(s => (
              <div key={s.n} style={{ textAlign:'center', padding: '20px 12px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background:'#C9A84C', color:'#1C1A17',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize: 17, fontWeight: 700,
                  margin:'0 auto 14px',
                }}>{s.n}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color:'rgba(255,255,255,.9)', marginBottom: 8 }}>{s.title}</div>
                <div style={{ fontSize: 13, color:'rgba(255,255,255,.55)', lineHeight: 1.55 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 80 }}>
          <div style={{ fontSize:12, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(201,168,76,.7)', marginBottom: 32, textAlign:'center' }}>
            Common questions
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap: 20, maxWidth: 900, margin:'0 auto' }}>
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{
                padding: 18, borderRadius: 12,
                background:'rgba(255,255,255,.02)',
                border:'0.5px solid rgba(255,255,255,.06)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color:'rgba(255,255,255,.9)', marginBottom: 6 }}>{q}</div>
                <div style={{ fontSize: 13, color:'rgba(255,255,255,.55)', lineHeight: 1.55 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div style={{
          marginTop: 80, padding: '36px 32px', borderRadius: 16,
          background:'linear-gradient(180deg, rgba(201,168,76,.10), rgba(201,168,76,.03))',
          border:'0.5px solid rgba(201,168,76,.25)',
          textAlign:'center', maxWidth: 640, margin: '80px auto 0',
        }}>
          <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize: 32, fontWeight: 400, color:'rgba(255,255,255,.95)', marginBottom: 8, letterSpacing:'.02em' }}>
            See your weekend
          </div>
          <div style={{ fontSize: 14, color:'rgba(255,255,255,.55)', marginBottom: 22, lineHeight: 1.5 }}>
            No signup, no scroll. Just open and skim.
          </div>
          <CTAButtons onGuest={onDemo} onGoogleSignIn={handleGoogleSignIn} loading={loading} />

          {/* Remember me */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap: 8, marginTop: 14, cursor:'pointer' }}
               onClick={() => setRememberMe(r => !r)}>
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${rememberMe ? '#C9A84C' : 'rgba(255,255,255,.2)'}`,
              background: rememberMe ? 'rgba(201,168,76,.2)' : 'transparent',
              display:'flex', alignItems:'center', justifyContent:'center',
            }}>
              {rememberMe && <span style={{ fontSize: 10, color:'#C9A84C' }}>✓</span>}
            </div>
            <span style={{ fontSize: 11, color:'rgba(255,255,255,.45)', userSelect:'none' }}>Remember me on this device</span>
          </div>
        </div>

        <div style={{ marginTop: 60, paddingTop: 28, borderTop:'0.5px solid rgba(255,255,255,.06)' }}>
          <InfoFooter onShowPage={onShowPage} />
        </div>

        <div style={{ marginTop: 18, fontSize: 11, color:'rgba(255,255,255,.18)', textAlign:'center', lineHeight: 1.6 }}>
          Free to use · DC Metro · Updated weekly · Built in Falls Church, VA
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
