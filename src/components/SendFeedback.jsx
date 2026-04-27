// ── SendFeedback.jsx ──────────────────────────────────────────────────────
// Floating "💬 Feedback" button bottom-right + modal that posts free-text
// feedback to /api/feedback. Lands in the user_feedback Postgres table for
// Adam to triage. Categories: bug | idea | data | praise | other.
//
// Suppressed on Ambient (clock/photo screen). Hidden during onboarding
// + welcome screens via where it's mounted in App.jsx.

import { useState, useEffect } from 'react';

const CATEGORIES = [
  { id: 'bug',    label: 'Bug',         icon: '🐛', color: '#FDA4AF' },
  { id: 'idea',   label: 'Idea',        icon: '💡', color: '#FDE68A' },
  { id: 'data',   label: 'Bad data',    icon: '📊', color: '#FBA74E' },
  { id: 'praise', label: 'Praise',      icon: '🙏', color: '#6EE7A0' },
  { id: 'other',  label: 'Other',       icon: '💬', color: 'rgba(255,255,255,.6)' },
];

export default function SendFeedback({ user, profileId }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('idea');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  // Esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setSent(false);
      setError(null);
    }
  }, [open]);

  const submit = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setSending(true);
    setError(null);
    try {
      const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res = await fetch(`${BASE}/feedback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          body:      trimmed,
          category,
          profileId: profileId || null,
          email:     user?.email || null,
          userId:    user?.id   || null,
          context: {
            url:      typeof window !== 'undefined' ? window.location.href : null,
            ua:       typeof navigator !== 'undefined' ? navigator.userAgent : null,
            viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : null,
            ts:       new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Server returned ${res.status}`);
      }
      setSent(true);
      setBody('');
      // Auto-close after 1.5s on success
      setTimeout(() => setOpen(false), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Floating button — bottom-right, above tap targets in cards. */}
      <button
        onClick={() => setOpen(true)}
        title="Send feedback"
        style={{
          position: 'fixed',
          bottom:   'calc(env(safe-area-inset-bottom, 0px) + 14px)',
          right:    14,
          zIndex:   75,
          width:    44, height: 44, borderRadius: '50%',
          background: 'rgba(28,26,23,.86)',
          border: '0.5px solid rgba(201,168,76,.45)',
          color: '#C9A84C', fontSize: 20,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,.4)',
          fontFamily: 'DM Sans, sans-serif',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .12s, background .12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.background = 'rgba(28,26,23,.95)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)';   e.currentTarget.style.background = 'rgba(28,26,23,.86)'; }}
      >
        💬
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: 16, fontFamily: 'DM Sans, sans-serif',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1C1A17', border: '0.5px solid rgba(255,255,255,.14)',
              borderRadius: 16, padding: '18px 20px',
              maxWidth: 460, width: '100%',
              marginBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
              boxShadow: '0 16px 48px rgba(0,0,0,.5)',
              animation: 'sheetUp 250ms cubic-bezier(.4,0,.2,1) both',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{
                fontFamily: 'Cormorant Garamond, serif', fontSize: 22, fontWeight: 400,
                color: '#C9A84C', letterSpacing: '.02em',
              }}>Send feedback</div>
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,.35)',
                cursor: 'pointer', fontSize: 18, padding: '2px 6px',
              }}>✕</button>
            </div>

            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginBottom: 14, lineHeight: 1.4 }}>
              Bug, idea, bad data on a card, or just a hi — anything goes. Goes straight to Adam.
            </div>

            {/* Category pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {CATEGORIES.map(c => {
                const active = category === c.id;
                return (
                  <button key={c.id}
                    onClick={() => setCategory(c.id)}
                    style={{
                      padding: '5px 12px', fontSize: 11, fontWeight: 600,
                      borderRadius: 99, cursor: 'pointer',
                      background: active ? `${c.color}22` : 'rgba(255,255,255,.05)',
                      border:    `0.5px solid ${active ? c.color : 'rgba(255,255,255,.12)'}`,
                      color:      active ? c.color : 'rgba(255,255,255,.55)',
                      fontFamily: 'DM Sans, sans-serif',
                      display: 'flex', alignItems: 'center', gap: 5,
                    }}
                  >
                    <span>{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>

            <textarea
              value={body}
              onChange={e => setBody(e.target.value.slice(0, 4000))}
              placeholder={
                category === 'bug'    ? "What broke? What were you doing right before?"
              : category === 'idea'   ? "What would make Locale better?"
              : category === 'data'   ? "Which event/card had bad info?"
              : category === 'praise' ? "Tell me what's working :)"
              : "What's on your mind?"
              }
              rows={5}
              autoFocus
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '0.5px solid rgba(255,255,255,.14)',
                background: 'rgba(255,255,255,.04)',
                color: 'rgba(255,255,255,.9)', fontSize: 13, lineHeight: 1.5,
                fontFamily: 'DM Sans, sans-serif', resize: 'vertical',
                minHeight: 90, outline: 'none', boxSizing: 'border-box',
              }}
            />
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,.3)',
              textAlign: 'right', marginTop: 4,
            }}>{body.length}/4000</div>

            {error && (
              <div style={{
                fontSize: 12, color: '#FDA4AF',
                background: 'rgba(159,18,57,.15)',
                border: '0.5px solid rgba(253,164,175,.25)',
                borderRadius: 8, padding: '8px 12px', marginTop: 8,
              }}>Couldn't send: {error}</div>
            )}

            <button
              onClick={submit}
              disabled={!body.trim() || sending || sent}
              style={{
                width: '100%', marginTop: 12, padding: '11px 16px',
                borderRadius: 10, cursor: !body.trim() || sending ? 'default' : 'pointer',
                background: sent ? 'rgba(26,99,50,.4)' : '#C9A84C',
                color:      sent ? '#6EE7A0' : '#1C1A17',
                border: 'none', fontSize: 14, fontWeight: 700,
                fontFamily: 'DM Sans, sans-serif',
                opacity: !body.trim() || sending ? 0.6 : 1,
                transition: 'all .15s',
              }}
            >
              {sent      ? '✓ Sent. Thanks.'
             : sending   ? 'Sending…'
             : 'Send'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
