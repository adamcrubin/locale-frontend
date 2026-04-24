import { useState } from 'react';
import { postFeedback } from '../../lib/api';
import { formatMusicGenre, formatSportsEmoji, formatWhen, formatVenue, formatCost } from './utils';
import ActionBar from './ActionBar';

export default function ActCard({ act, catId, cardBg, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, homeAddress, profileId }) {
  const [expanded,      setExpanded]      = useState(false);
  const [thumbFeedback, setThumbFeedback] = useState(null);
  const [exiting,       setExiting]       = useState(false);

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
        <span style={{
          fontSize: 10, color: 'var(--subtle)', flexShrink: 0,
          transition: 'transform .2s',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          display: 'inline-block',
        }}>▾</span>
      </div>

      {isExpanded && (
        <div style={{ padding: '0 12px 10px' }}>
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
        </div>
      )}
    </div>
  );
}
