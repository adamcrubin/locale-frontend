// ── ProfileSelectScreen.jsx ───────────────────────────────────────────────────
//
// Full-screen Netflix-style profile picker shown after Google sign-in
// when there are 2+ profiles in the household.
// Single-profile households skip straight to Ambient.

import { useState } from 'react';
import { PROFILE_COLORS } from '../data/content';

export default function ProfileSelectScreen({ profiles, onSelect, user }) {
  const [hovered, setHovered] = useState(null);

  const getColor = (p) => PROFILE_COLORS.find(c => c.id === p.colorId) || PROFILE_COLORS[0];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0C0A08',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'DM Sans, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,.06) 0%, transparent 60%)',
      }} />

      {/* Logo */}
      <div style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: 22, fontWeight: 300,
        color: 'rgba(255,255,255,.25)',
        letterSpacing: '.1em',
        marginBottom: 56,
      }}>Locale</div>

      {/* Heading */}
      <div style={{
        fontFamily: 'Cormorant Garamond, serif',
        fontSize: 34, fontWeight: 300,
        color: 'rgba(255,255,255,.9)',
        marginBottom: 10, letterSpacing: '.02em',
      }}>Who's planning?</div>
      <div style={{
        fontSize: 13, color: 'rgba(255,255,255,.3)',
        marginBottom: 52, textAlign: 'center',
      }}>
        Your activities will be tailored to your preferences
      </div>

      {/* Profile tiles */}
      <div style={{
        display: 'flex', gap: 24, flexWrap: 'wrap',
        justifyContent: 'center', maxWidth: 700,
      }}>
        {profiles.map(p => {
          const color = getColor(p);
          const isHovered = hovered === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 12,
                padding: '24px 20px',
                borderRadius: 16,
                background: isHovered ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.03)',
                border: `0.5px solid ${isHovered ? color.border : 'rgba(255,255,255,.08)'}`,
                cursor: 'pointer',
                transition: 'all .2s',
                transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                minWidth: 140,
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%',
                background: `linear-gradient(135deg, ${color.hex}, ${color.border})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: 'white',
                boxShadow: isHovered ? `0 0 24px ${color.hex}55` : 'none',
                transition: 'box-shadow .2s',
              }}>
                {p.name.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div style={{
                fontSize: 15, fontWeight: 500,
                color: isHovered ? 'rgba(255,255,255,.95)' : 'rgba(255,255,255,.7)',
                transition: 'color .2s',
              }}>{p.name}</div>

              {/* Prefs preview */}
              {p.prefs?.length > 0 && (
                <div style={{
                  fontSize: 10, color: 'rgba(255,255,255,.28)',
                  textAlign: 'center', lineHeight: 1.5, maxWidth: 120,
                }}>
                  {p.prefs.slice(0, 2).join(' · ')}
                </div>
              )}
            </button>
          );
        })}

        {/* Add profile tile */}
        <button
          onClick={() => onSelect('__add__')}
          onMouseEnter={() => setHovered('__add__')}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 12,
            padding: '24px 20px',
            borderRadius: 16,
            background: 'transparent',
            border: '0.5px solid rgba(255,255,255,.08)',
            cursor: 'pointer',
            transition: 'all .2s',
            opacity: hovered === '__add__' ? 0.7 : 0.4,
            minWidth: 140,
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            border: '1.5px dashed rgba(255,255,255,.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: 'rgba(255,255,255,.4)',
          }}>+</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,.4)' }}>Add profile</div>
        </button>
      </div>

      {/* Signed in as */}
      {user?.email && (
        <div style={{ marginTop: 52, fontSize: 11, color: 'rgba(255,255,255,.18)' }}>
          Signed in as {user.email}
        </div>
      )}
    </div>
  );
}
