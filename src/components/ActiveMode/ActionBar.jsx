import { useState } from 'react';

function ABtn({ icon, title, onClick, dim, isMap, hoverBg, hoverColor, color, active, activeBg, activeColor }) {
  const [h, setH] = useState(false);
  const bg  = active ? activeBg  : (h ? (hoverBg  || 'rgba(0,0,0,.06)') : 'transparent');
  const clr = active ? activeColor : (h ? (hoverColor || '#1C1A17') : (color || (dim ? 'rgba(0,0,0,.2)' : '#6A6560')));

  if (isMap) return (
    <button onClick={onClick} title={title} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      width:28,height:28,borderRadius:8,border:`0.5px solid ${h?'rgba(234,67,53,.3)':'rgba(0,0,0,.12)'}`,
      background:h?'#FFF5F5':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:0,transition:'all .12s',
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill={h?"#EA4335":"#aaa"}/></svg>
    </button>
  );

  return (
    <button onClick={onClick} title={title} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} style={{
      width:28,height:28,borderRadius:8,
      border:`0.5px solid ${active?(activeColor+'44'):'rgba(0,0,0,.12)'}`,
      background:bg,cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',
      color:clr,transition:'all .12s',fontFamily:'DM Sans,sans-serif',opacity:dim?0.35:1,
    }}>{icon}</button>
  );
}

export { ABtn };

export default function ActionBar({ act, catId, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, homeAddress }) {
  const [thumbed,    setThumbed]    = useState(null);
  const [copied,     setCopied]     = useState(false);

  const handleDirections = () => {
    const dest   = encodeURIComponent(act.address || act.where || act.title);
    const origin = homeAddress ? encodeURIComponent(homeAddress) : '';
    window.open(origin
      ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}`
      : `https://www.google.com/maps/search/?api=1&query=${dest}`, '_blank');
  };

  const searchQ = `${(act.title||'')} ${(act.venue || act.where || 'DC')} tickets -pinterest -facebook`;
  const eventUrl = act.url || `https://www.google.com/search?btnI=1&q=${encodeURIComponent(searchQ)}`;

  const hasSpecificTicketUrl = (() => {
    if (!act.ticket_url) return false;
    try {
      const u = new URL(act.ticket_url);
      const path = u.pathname.replace(/\/$/, '');
      if (!path || path.length < 8) return false;
      const bareDomains = ['ticketmaster.com','livenation.com','stubhub.com','seatgeek.com','axs.com','eventbrite.com','resy.com','opentable.com'];
      if (bareDomains.includes(u.hostname.replace(/^www\./,'')) && !/\d/.test(path)) return false;
      return true;
    } catch { return false; }
  })();
  const shareText = `${act.title}${act.when ? ' — ' + act.when : ''}${act.where ? ' at ' + act.where : ''}`;

  const handleShare = async (e) => {
    e.stopPropagation();
    if (navigator.share) {
      try { await navigator.share({ title: act.title, text: shareText, url: eventUrl }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(eventUrl); } catch { prompt('Copy this link:', eventUrl); }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:4, position:'relative' }}>
      <ABtn icon="📅" title="Add to calendar" onClick={()=>onCal(act)} />
      <ABtn isMap title="Directions" onClick={handleDirections} />

      {hasSpecificTicketUrl && (
        <a href={act.ticket_url} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()} title="Buy tickets"
          style={{ textDecoration:'none' }}>
          <button style={{
            width:28, height:28, borderRadius:8,
            border:'0.5px solid rgba(201,168,76,.35)',
            background:'rgba(201,168,76,.12)',
            cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
            color:'#C9A84C',
          }}>🎟</button>
        </a>
      )}

      <a href={eventUrl} target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()} title={act.url ? 'Open event page' : 'Search for this event'}
        style={{ textDecoration:'none' }}>
        <button style={{
          width:28, height:28, borderRadius:8,
          border:`0.5px solid ${act.url ? 'rgba(37,99,235,.3)' : 'rgba(0,0,0,.12)'}`,
          background: act.url ? 'rgba(37,99,235,.08)' : 'transparent',
          cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center',
          color: act.url ? '#2563EB' : '#aaa', opacity: act.url ? 1 : 0.5,
        }}>🔗</button>
      </a>

      <button
        onClick={handleShare}
        title={copied ? 'Link copied' : 'Share this event'}
        style={{
          width:28, height:28, borderRadius:8,
          border:`0.5px solid ${copied ? 'rgba(34,197,94,.4)' : 'rgba(0,0,0,.12)'}`,
          background: copied ? 'rgba(34,197,94,.1)' : 'transparent',
          cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center',
          color: copied ? '#16A34A' : '#6B6560',
          transition: 'all .15s',
          fontWeight: 600,
        }}
      >{copied ? '✓' : '↗'}</button>

      <div style={{flex:1}}/>
      <ABtn icon="♥" title="Save" onClick={()=>onHeart(act)} hoverBg="#FFF1F2" hoverColor="#E53E3E" color="#E53E3E" />
      <ABtn icon="👍" title={thumbed==='up'?"Undo":"More like this"} onClick={()=>{setThumbed(t=>t==='up'?null:'up');onThumbUp(act);}} active={thumbed==='up'} activeBg="#E8F5EC" activeColor="#1A6332" />
      <ABtn icon="👎" title={thumbed==='down'?"Undo":"Less like this"} onClick={()=>{setThumbed(t=>t==='down'?null:'down');onThumbDown(act);}} active={thumbed==='down'} activeBg="#FFF1F2" activeColor="#9A3412" />
    </div>
  );
}
