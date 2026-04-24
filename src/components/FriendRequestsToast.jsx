// ── FriendRequestsToast.jsx ─────────────────────────────────────────────────
// Shows a small sticky toast when the user has incoming friend requests
// waiting. One per session (sessionStorage dismiss flag). Clicking opens
// Settings so the user can accept/decline inline.

import { useEffect, useState } from 'react';
import { fetchFriendsPending } from '../lib/api';

const DISMISS_KEY = 'locale.friendsToastDismissed';

export default function FriendRequestsToast({ user, onOpenSettings }) {
  const [count,     setCount]     = useState(0);
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; }
  });

  useEffect(() => {
    if (!user?.id || dismissed) return;
    let cancelled = false;
    fetchFriendsPending(user.id).then(list => {
      if (!cancelled) setCount(list.length);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id, dismissed]);

  if (dismissed || count === 0) return null;

  const close = () => {
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
    setDismissed(true);
  };

  return (
    <div style={{
      position: 'fixed', top: 70, right: 12, left: 'auto', zIndex: 50,
      background: 'rgba(28, 26, 23, 0.96)', backdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(201, 168, 76, .35)',
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
      boxShadow: '0 6px 18px rgba(0,0,0,.35)',
      animation: 'fadeIn 250ms ease both',
      fontFamily: 'DM Sans, sans-serif',
      width: 'min(320px, calc(100vw - 24px))',
      boxSizing: 'border-box',
    }}>
      <span style={{ fontSize: 18 }}>👋</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.9)', fontWeight: 500 }}>
          {count === 1 ? '1 friend request' : `${count} friend requests`}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>
          Accept in Settings → Friends
        </div>
      </div>
      <button onClick={() => { close(); onOpenSettings?.(); }} style={{
        fontSize: 11, padding: '4px 10px', borderRadius: 7, cursor: 'pointer',
        background: 'rgba(201,168,76,.2)', border: '0.5px solid rgba(201,168,76,.35)',
        color: '#C9A84C', fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
      }}>Open</button>
      <button onClick={close} style={{
        fontSize: 11, padding: '3px 7px', borderRadius: 6, cursor: 'pointer',
        background: 'transparent', border: 'none',
        color: 'rgba(255,255,255,.35)', fontFamily: 'DM Sans, sans-serif',
      }}>✕</button>
    </div>
  );
}
