import { useState } from 'react';
import { addCalendarEvent } from '../lib/api';

export default function CalendarModal({ activity, gcalConnected, onClose, onAdded, userId, profileId }) {
  const nextSat = (() => {
    const d = new Date();
    const n = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  })();

  const [title,  setTitle]  = useState(activity?.title || '');
  const [date,   setDate]   = useState(nextSat);
  const [time,   setTime]   = useState('10:00');
  const [notes,  setNotes]  = useState(activity?.why || activity?.description || '');
  const [status, setStatus] = useState('');
  const [done,   setDone]   = useState(false);

  const submit = async () => {
    if (!title || !date) { setStatus('Fill in title and date'); return; }
    setStatus(gcalConnected ? 'Adding to Google Calendar…' : 'Saving…');

    let googleId = null;
    try {
      if (gcalConnected && userId) {
        const result = await addCalendarEvent({ title, date, time, notes, userId, profileId });
        googleId = result?.id || null;
        setStatus('Added to Google Calendar!');
      } else {
        setStatus('Saved! Sign in with Google to sync to Calendar.');
      }
    } catch (e) {
      setStatus('Saved — Google Calendar sync failed');
    }

    setDone(true);
    onAdded({ title, date, time, googleId, added: true, fromGoogle: !!googleId, activityId: activity?.id, activityType: activity?.content_type });
    setTimeout(onClose, 1600);
  };

  const inp = {
    width:'100%', padding:'7px 10px', borderRadius:8,
    border:'0.5px solid rgba(255,255,255,.12)', fontSize:12,
    background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)',
    fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box',
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70, padding:16 }}>
      <div style={{ background:'#252220', borderRadius:14, border:'0.5px solid rgba(255,255,255,.1)', padding:20, width:310, maxWidth:'100%' }}>
        <div className="serif" style={{ fontSize:17, color:'rgba(255,255,255,.9)', fontWeight:300, marginBottom:4 }}>Add to calendar</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:14 }}>
          {activity?.where || activity?.venue} · {activity?.cost || activity?.cost_display}
        </div>
        {[
          { l:'Title', t:'text',  v:title, s:setTitle },
          { l:'Date',  t:'date',  v:date,  s:setDate  },
          { l:'Time',  t:'time',  v:time,  s:setTime  },
          { l:'Notes', t:'text',  v:notes, s:setNotes },
        ].map(f => (
          <div key={f.l} style={{ marginBottom:9 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.35)', display:'block', marginBottom:3 }}>{f.l}</label>
            <input type={f.t} value={f.v} onChange={e => f.s(e.target.value)} style={inp} />
          </div>
        ))}

        {/* Google Calendar badge */}
        {gcalConnected && (
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, padding:'5px 8px', background:'rgba(66,133,244,.1)', borderRadius:7, border:'0.5px solid rgba(66,133,244,.2)' }}>
            <span style={{ fontSize:11 }}>📅</span>
            <span style={{ fontSize:11, color:'#93BBFD' }}>Will sync to Google Calendar</span>
          </div>
        )}

        <div style={{ display:'flex', gap:7, marginTop:4 }}>
          <button onClick={onClose} style={{ flex:1, padding:8, borderRadius:9, fontSize:12, cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.45)', border:'0.5px solid rgba(255,255,255,.12)', fontFamily:'DM Sans, sans-serif' }}>Cancel</button>
          <button onClick={submit} disabled={done} style={{ flex:1, padding:8, borderRadius:9, fontSize:12, cursor:done?'default':'pointer', background:'rgba(26,99,50,.35)', color:'#6EE7A0', border:'0.5px solid rgba(110,231,160,.25)', fontFamily:'DM Sans, sans-serif', fontWeight:500 }}>
            {done ? '✓ Added' : 'Add to calendar'}
          </button>
        </div>
        {status && (
          <div style={{ fontSize:11, textAlign:'center', marginTop:9, padding:'6px 10px', borderRadius:8, background:done?'rgba(26,99,50,.25)':'rgba(201,168,76,.15)', color:done?'#6EE7A0':'#C9A84C' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  );
}
