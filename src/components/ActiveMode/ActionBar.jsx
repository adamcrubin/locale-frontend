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

      {/* Smart Open — single button that resolves to the most useful link:
          1. Reservation (Resy/OpenTable) for restaurants
          2. Specific ticket URL when the extractor found one
          3. Event page on the venue/source
          4. Falls back to a Google search if we have nothing direct */}
      {(() => {
        let href = null, label = 'Open', icon = '🔗',
            ring = 'rgba(0,0,0,.12)', bg = 'transparent', color = '#6B6560';
        if (act.reservation_url) {
          href = act.reservation_url;
          const platform = act.reservation_platform === 'resy' ? 'Resy' : 'OpenTable';
          label = act.reservation_is_search ? 'Find a table' : 'Reserve';
          icon  = '🍽'; ring = 'rgba(34,197,94,.4)'; bg = 'rgba(34,197,94,.12)'; color = '#16A34A';
        } else if (hasSpecificTicketUrl) {
          href = act.ticket_url;
          label = 'Tickets'; icon = '🎟';
          ring = 'rgba(201,168,76,.4)'; bg = 'rgba(201,168,76,.14)'; color = '#A6822A';
        } else if (act.url) {
          href = act.url;
          label = 'Open page'; icon = '🔗';
          ring = 'rgba(37,99,235,.35)'; bg = 'rgba(37,99,235,.10)'; color = '#2563EB';
        } else {
          href = eventUrl; // Google search fallback
          label = 'Search'; icon = '🔎';
          ring = 'rgba(0,0,0,.12)'; bg = 'transparent'; color = '#6B6560';
        }
        return (
          <a href={href} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()} title={label}
            style={{ textDecoration:'none' }}>
            <button style={{
              height:28, padding:'0 10px', borderRadius:8,
              border:`0.5px solid ${ring}`, background:bg, color,
              cursor:'pointer', fontSize:11, fontWeight:600,
              display:'flex', alignItems:'center', gap:5, fontFamily:'DM Sans, sans-serif',
            }}>
              <span style={{ fontSize:12 }}>{icon}</span>{label}
            </button>
          </a>
        );
      })()}

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
      {/* Save (heart) intentionally removed — thumbs-up already signals "I like this"
          and the calendar add covers "I want this." Two separate save flows
          made the bar busier without adding signal. */}
      <ABtn icon="👍" title={thumbed==='up'?"Undo":"More like this"} onClick={()=>{setThumbed(t=>t==='up'?null:'up');onThumbUp(act);}} active={thumbed==='up'} activeBg="#E8F5EC" activeColor="#1A6332" />
      <ABtn icon="👎" title={thumbed==='down'?"Undo":"Less like this"} onClick={()=>{setThumbed(t=>t==='down'?null:'down');onThumbDown(act);}} active={thumbed==='down'} activeBg="#FFF1F2" activeColor="#9A3412" />
    </div>
  );
}
