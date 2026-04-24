import { useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export default function EditCalendarEventModal({ event, userId, profileId, onClose, onSaved, onDeleted }) {
  const [title,   setTitle]   = useState(event.title || event.name || '');
  const [date,    setDate]    = useState(event.date || '');
  const [time,    setTime]    = useState(event.time || '10:00');
  const [notes,   setNotes]   = useState(event.notes || '');
  const [status,  setStatus]  = useState('');
  const [busy,    setBusy]    = useState(false);

  const inp = {
    width:'100%', padding:'7px 10px', borderRadius:8,
    border:'0.5px solid rgba(255,255,255,.12)', fontSize:12,
    background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)',
    fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box',
  };

  const save = async () => {
    if (!title || !date) { setStatus('Fill in title and date'); return; }
    setBusy(true);
    setStatus('Updating…');
    try {
      const res = await fetch(`${BASE}/calendar/events/${event.googleId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, date, time, notes, userId, profileId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Update failed');
      setStatus('Updated!');
      setTimeout(() => { onSaved({ ...event, title, date, time }); onClose(); }, 900);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
      setBusy(false);
    }
  };

  const del = async () => {
    if (!window.confirm(`Delete "${title}" from Google Calendar?`)) return;
    setBusy(true);
    setStatus('Deleting…');
    try {
      const res = await fetch(`${BASE}/calendar/events/${event.googleId}`, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, profileId }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || 'Delete failed');
      setStatus('Deleted');
      setTimeout(() => { onDeleted(event.googleId); onClose(); }, 700);
    } catch (e) {
      setStatus(`Error: ${e.message}`);
      setBusy(false);
    }
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70, padding:16 }}>
      <div style={{ background:'#252220', borderRadius:14, border:'0.5px solid rgba(255,255,255,.1)', padding:20, width:310, maxWidth:'100%' }}>
        <div className="serif" style={{ fontSize:17, color:'rgba(255,255,255,.9)', fontWeight:300, marginBottom:14 }}>Edit calendar event</div>

        {[
          { l:'Title', t:'text', v:title, s:setTitle },
          { l:'Date',  t:'date', v:date,  s:setDate  },
          { l:'Time',  t:'time', v:time,  s:setTime  },
          { l:'Notes', t:'text', v:notes, s:setNotes },
        ].map(f => (
          <div key={f.l} style={{ marginBottom:9 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.35)', display:'block', marginBottom:3 }}>{f.l}</label>
            <input type={f.t} value={f.v} onChange={e => f.s(e.target.value)} style={inp} />
          </div>
        ))}

        <div style={{ display:'flex', gap:7, marginTop:4 }}>
          <button onClick={onClose} disabled={busy} style={{ flex:1, padding:8, borderRadius:9, fontSize:12, cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.45)', border:'0.5px solid rgba(255,255,255,.12)', fontFamily:'DM Sans, sans-serif' }}>Cancel</button>
          <button onClick={save} disabled={busy} style={{ flex:1, padding:8, borderRadius:9, fontSize:12, cursor:'pointer', background:'rgba(26,99,50,.35)', color:'#6EE7A0', border:'0.5px solid rgba(110,231,160,.25)', fontFamily:'DM Sans, sans-serif', fontWeight:500 }}>Save</button>
        </div>

        {event.googleId && (
          <button onClick={del} disabled={busy} style={{ width:'100%', marginTop:8, padding:8, borderRadius:9, fontSize:12, cursor:'pointer', background:'rgba(190,18,60,.12)', color:'#FDA4AF', border:'0.5px solid rgba(190,18,60,.25)', fontFamily:'DM Sans, sans-serif' }}>
            🗑 Delete event
          </button>
        )}

        {status && (
          <div style={{ fontSize:11, textAlign:'center', marginTop:9, padding:'6px 10px', borderRadius:8, background:'rgba(255,255,255,.05)', color:'rgba(255,255,255,.5)' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
