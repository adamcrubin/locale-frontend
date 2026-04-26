import { useEffect } from 'react';

export default function LoginPromptModal({ open, feature, mode, onClose, onSignIn }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Two-mode messaging:
  //   mode='calendar-connect' → user is signed in, just needs the calendar
  //   scope. Different framing: "Connect your calendar" rather than "Sign in".
  //   default → user is unsigned-in (browsing without account).
  const isCalendarConnect = mode === 'calendar-connect';
  const messages = {
    save:        'Save events to revisit them later.',
    thumbs:      'Rate events to personalize your feed.',
    calendar:    isCalendarConnect
                   ? 'Locale needs permission to add events to your calendar. We only ask for calendar access when you actually use it.'
                   : 'Sign in or create an account to sync events with your calendar.',
    'see-more':  'Sign in or create an account to see more events. Locale ranks them by your tastes when you sign in.',
    settings:    'Customize your preferences.',
    profile:     'Create and switch between profiles.',
    saved:       'See everything you\'ve saved.',
    ai:          'Sign in to ask Locale to tailor your recommendations.',
    reserve:     'Book and reserve with one tap.',
    default:     'Sign in or create an account to use this feature.',
  };
  const copy = messages[feature] || messages.default;
  const title    = isCalendarConnect ? 'Connect your calendar' : 'Sign in to continue';
  const ctaLabel = isCalendarConnect ? 'Allow calendar access' : 'Continue with Google';

  return (
    <div
      onClick={onClose}
      style={{
        position:'fixed', inset:0, zIndex:1000,
        background:'rgba(0,0,0,.72)', backdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:20, fontFamily:'DM Sans, sans-serif',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background:'#1C1A17', border:'0.5px solid rgba(255,255,255,.14)',
          borderRadius:16, padding:'28px 24px', maxWidth:340, width:'100%',
          boxShadow:'0 20px 60px rgba(0,0,0,.5)',
        }}
      >
        <div style={{
          fontFamily:'Cormorant Garamond, serif', fontSize:26, fontWeight:400,
          color:'#C9A84C', marginBottom:8, letterSpacing:'.02em',
        }}>
          {title}
        </div>
        <div style={{ fontSize:14, color:'rgba(255,255,255,.62)', lineHeight:1.45, marginBottom:22 }}>
          {copy}
        </div>
        <button
          onClick={onSignIn}
          style={{
            width:'100%', padding:'12px 14px', borderRadius:10,
            background:'#C9A84C', color:'#1C1A17', border:'none',
            fontSize:14, fontWeight:600, cursor:'pointer', marginBottom:10,
            fontFamily:'DM Sans, sans-serif',
          }}
        >
          {ctaLabel}
        </button>
        <button
          onClick={onClose}
          style={{
            width:'100%', padding:'10px 14px', borderRadius:10,
            background:'transparent', color:'rgba(255,255,255,.5)',
            border:'0.5px solid rgba(255,255,255,.14)',
            fontSize:13, cursor:'pointer', fontFamily:'DM Sans, sans-serif',
          }}
        >
          Keep browsing without an account
        </button>
      </div>
    </div>
  );
}
