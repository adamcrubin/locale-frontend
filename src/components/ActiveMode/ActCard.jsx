import { useState } from 'react';
import { postFeedback } from '../../lib/api';
import { formatMusicGenre, formatSportsEmoji, formatWhen, formatVenue, formatCost } from './utils';
import ActionBar from './ActionBar';

// Stable per-name colors for friend avatars. Hash first char to index.
const AVATAR_COLORS = ['#C9A84C', '#818CF8', '#34D399', '#F472B6', '#60A5FA', '#FBA74E', '#A78BFA'];
function avatarColor(name) {
  const code = (name || '').trim().charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}
function firstInitial(name) {
  return (name || '?').trim().charAt(0).toUpperCase() || '?';
}
function firstName(name) {
  return (name || '').split(/\s+/)[0] || 'Someone';
}
function formatInterestedLine(friends) {
  if (!friends?.length) return null;
  const names = friends.map(f => firstName(f.name));
  if (names.length === 1) return `${names[0]} is interested in this event`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are interested in this event`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} other${names.length > 3 ? 's' : ''} are interested in this event`;
}

export default function ActCard({ act, catId, cardBg, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, homeAddress, profileId }) {
  const [expanded,      setExpanded]      = useState(false);
  const [thumbFeedback, setThumbFeedback] = useState(null);
  const [exiting,       setExiting]       = useState(false);
  // Track image load failures so we can hide broken thumbnails and
  // fall back to the gradient hero treatment without an empty rect.
  const [imgBroken,     setImgBroken]     = useState(false);
  const hasImage = !!act.image_url && !imgBroken;

  const isRec      = act.content_type === 'recommendation';
  const isExpanded = expanded;
  const isCompact  = !isExpanded;

  const sendFeedback = (fb) => {
    if (!act.id || !profileId) return;
    postFeedback(profileId, act.id, act.content_type || 'event', fb).catch(() => {});
  };

  const handleThumbUp   = () => { sendFeedback('up');   setThumbFeedback({ msg:"We'll show more like this 👍", ok:true  }); onThumbUp(act);   setTimeout(() => setThumbFeedback(null), 2200); };
  const handleThumbDown = () => { sendFeedback('down'); setThumbFeedback({ msg:"Got it -- we'll show less like this 👎", ok:false }); onThumbDown(act); setTimeout(() => setThumbFeedback(null), 2200); };

  const toggle = () => setExpanded(e => !e);

  // Default card bg: recommendations get a warm off-white; everything else is pure white.
  // The Curated column passes an explicit `cardBg` (honey-gold tint) so its cards stand out.
  const baseBg = cardBg ?? (isRec ? '#F9F7F4' : '#FFFFFF');

  return (
    <div style={{
      background:   baseBg,
      border:       cardBg ? '1px solid rgba(201,168,76,.25)' : '1px solid rgba(0,0,0,0.10)',
      borderRadius: 8,
      minHeight:    44,
      flexShrink:   0,
      boxShadow:    '0 1px 3px rgba(0,0,0,0.06)',
      animation:    exiting ? 'cardOut 200ms ease both' : 'fadeIn 220ms ease both',
      transition:   'box-shadow .15s',
    }}>
      {thumbFeedback && (
        <div style={{
          padding: '9px 12px',
          background: thumbFeedback.ok ? 'rgba(232,245,236,.95)' : 'rgba(255,241,242,.95)',
          fontSize: 12, color: thumbFeedback.ok ? '#1A6332' : '#9A3412',
          fontStyle: 'italic', textAlign: 'center',
          animation: 'fadeIn 150ms ease both',
        }}>{thumbFeedback.msg}</div>
      )}

      <div
        onClick={toggle}
        style={{
          padding: isCompact ? '7px 10px' : '9px 12px 6px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer',
          minHeight: 44,
          background: baseBg,
          userSelect: 'none',
        }}
      >
        {/* Compact thumbnail — shown only when we have a real image. No fallback here
            so imageless cards stay clean; the expanded view handles the gradient fallback. */}
        {hasImage && (
          <img src={act.image_url} alt="" onError={() => setImgBroken(true)}
            style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
        )}
        {isRec && <span style={{ fontSize: 10, flexShrink: 0 }}>🔄</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1C1A17', lineHeight: 1.3,
            overflow: isCompact ? 'hidden' : 'visible',
            textOverflow: isCompact ? 'ellipsis' : 'clip',
            whiteSpace: isCompact ? 'nowrap' : 'normal',
          }}>{act.title}</div>
          <div style={{ fontSize: 12, color: '#6B6560', marginTop: 2,
            overflow: isCompact ? 'hidden' : 'visible',
            textOverflow: isCompact ? 'ellipsis' : 'clip',
            whiteSpace: isCompact ? 'nowrap' : 'normal',
            display:'flex', alignItems:'center', gap:4, flexWrap: isCompact ? 'nowrap' : 'wrap',
          }}>
            {formatMusicGenre(act) && (
              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'rgba(139,92,246,.12)', color:'#7C3AED', border:'0.5px solid rgba(139,92,246,.25)', flexShrink:0, fontWeight:500 }}>{formatMusicGenre(act)}</span>
            )}
            {formatSportsEmoji(act) && (
              <span style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'rgba(34,197,94,.12)', color:'#16A34A', border:'0.5px solid rgba(34,197,94,.25)', flexShrink:0, fontWeight:500 }}>{formatSportsEmoji(act).emoji} {formatSportsEmoji(act).label}</span>
            )}
            <span style={{ overflow: isCompact ? 'hidden' : 'visible', textOverflow: isCompact ? 'ellipsis' : 'clip', whiteSpace: isCompact ? 'nowrap' : 'normal' }}>
              {[formatWhen(act), formatVenue(act), formatCost(act)].filter(Boolean).join(' · ')}
            </span>
          </div>
        </div>
        {act._conflict && <span title="Conflicts with existing calendar event" style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: '#FEE2E2', color: '#DC2626', flexShrink: 0 }}>⚠ conflict</span>}
        {/* Friend interest avatars — compact mode only. Up to 3 initials + "+N" overflow. */}
        {isCompact && act.friends_interested?.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', flexShrink:0, marginLeft:2 }}
            title={act.friends_interested.map(f => f.name).join(', ') + ' interested'}>
            {act.friends_interested.slice(0, 3).map((f, i) => (
              <div key={f.user_id || i} style={{
                width: 18, height: 18, borderRadius: '50%',
                background: avatarColor(f.name),
                color: 'white', fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #fff', marginLeft: i === 0 ? 0 : -6,
                flexShrink: 0,
              }}>{firstInitial(f.name)}</div>
            ))}
            {act.friends_interested.length > 3 && (
              <span style={{ fontSize: 9, color: '#6B6560', marginLeft: 3, fontWeight: 600 }}>
                +{act.friends_interested.length - 3}
              </span>
            )}
          </div>
        )}
        <span style={{
          fontSize: 10, color: 'var(--subtle)', flexShrink: 0,
          transition: 'transform .2s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </div>

      {isExpanded && (
        <div style={{ padding: '0 12px 10px' }}>
          {/* Hero — real image only. No fallback block (the category emoji is
              already shown on the column header + as the compact-mode title
              prefix in the Curated column). */}
          {hasImage && (
            <img src={act.image_url} alt="" onError={() => setImgBroken(true)}
              style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 6, marginBottom: 8, display: 'block' }} />
          )}
          {act.why && (
            <div style={{ fontSize: 11, color: '#6B6560', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>
              {act.why}
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 6 }}>
            {act.tags?.map(t => (
              <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--bg2)', color: 'var(--muted)', border: '0.5px solid var(--border)' }}>{t}</span>
            ))}
          </div>
          <ActionBar act={act} catId={catId} onCal={onCal} onRemove={() => { sendFeedback('dismissed'); setExiting(true); setTimeout(() => onRemove(act), 200); }}
            onHeart={onHeart} onThumbUp={handleThumbUp} onThumbDown={handleThumbDown}
            onReserve={onReserve} homeAddress={homeAddress} />
          {/* Friend-interest line — placed at the bottom so the primary content
              (why, tags, actions) reads first. */}
          {act.friends_interested?.length > 0 && (
            <div style={{
              fontSize: 11, color: '#8B6D2D', fontStyle: 'italic', lineHeight: 1.5,
              padding: '5px 8px', marginTop: 8,
              background: 'rgba(201,168,76,.10)', border: '0.5px solid rgba(201,168,76,.25)',
              borderRadius: 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <div style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
                {act.friends_interested.slice(0, 3).map((f, i) => (
                  <div key={f.user_id || i} style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: avatarColor(f.name),
                    color: 'white', fontSize: 8, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1.5px solid #fff', marginLeft: i === 0 ? 0 : -5,
                  }}>{firstInitial(f.name)}</div>
                ))}
              </div>
              <span>{formatInterestedLine(act.friends_interested)}</span>
            </div>
          )}
          {/* Source transparency — quiet footer, no score number. */}
          {(act.source_name || act.confidence) && (
            <div style={{
              fontSize: 10, color: '#8A847D', marginTop: 8, paddingTop: 8,
              borderTop: '0.5px solid rgba(0,0,0,.08)',
              display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
            }} title="Why this showed up in your feed">
              <span style={{ opacity: 0.6 }}>ℹ</span>
              {act.source_name && (
                <span>From <span style={{ fontWeight: 500, color: '#6B6560' }}>{act.source_name}</span></span>
              )}
              {act.confidence && (
                <span style={{
                  padding: '0 6px', borderRadius: 99, fontSize: 9,
                  background: act.confidence === 'confirmed' ? 'rgba(34,197,94,.12)' : 'rgba(201,168,76,.15)',
                  color:      act.confidence === 'confirmed' ? '#16A34A'              : '#8B6D2D',
                }}>{act.confidence === 'confirmed' ? '✓ confirmed' : '~ inferred'}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
