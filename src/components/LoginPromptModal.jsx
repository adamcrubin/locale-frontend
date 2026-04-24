import { useEffect } from 'react';

export default function LoginPromptModal({ open, feature, onClose, onSignIn }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const messages = {
    save:      'Save events to revisit them later.',
    thumbs:    'Rate events to personalize your feed.',
    calendar:  'Add events to your calendar.',
    settings:  'Customize your preferences.',
    profile:   'Create and switch between profiles.',
    saved:     'See everything you\'ve saved.',
    ai:        'Ask Locale to tailor your recommendations.',
    reserve:   'Book and reserve with one tap.',
    default:   'Sign in to use this feature.',
  };
  const copy = messages[feature] || messages.default;

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
          Sign in to continue
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
          Continue with Google
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
          Keep browsing demo
        </button>
      </div>
    </div>
  );
}
