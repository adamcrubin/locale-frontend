import { useState } from 'react';
import { addCalendarEvent } from '../lib/api';

// Convert "7:00 PM" / "7pm" / "19:00" → "19:00" for <input type="time">
function to24h(raw) {
  if (!raw) return '10:00';
  const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.?m\.?|p\.?m\.?)/i);
  if (m) {
    let h = parseInt(m[1]);
    const min = m[2] || '00';
    const isPM = /pm|p\.?m/i.test(m[3]);
    if (isPM && h < 12) h += 12;
    if (!isPM && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${min}`;
  }
  // Already HH:MM or H:MM
  const plain = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (plain) return `${String(parseInt(plain[1])).padStart(2,'0')}:${plain[2]}`;
  return '10:00';
}

function addHoursTo(hhmm, hours) {
  const [h, m] = hhmm.split(':').map(Number);
  const total = (h + hours) % 24;
  return `${String(total).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

export default function CalendarModal({ activity, gcalConnected, onClose, onAdded, userId, profileId }) {
  const nextSat = (() => {
    const d = new Date();
    const n = (6 - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  })();

  const initStart = to24h(activity?.start_time || activity?.time || activity?.when || '');
  const initEnd   = addHoursTo(initStart, 2);

  const [title,     setTitle]     = useState(activity?.title || '');
  const [date,      setDate]      = useState(activity?.start_date || nextSat);
  const [startTime, setStartTime] = useState(initStart);
  const [endTime,   setEndTime]   = useState(initEnd);
  const [notes,     setNotes]     = useState(activity?.why || activity?.description || '');
  const [status,    setStatus]    = useState('');
  const [done,      setDone]      = useState(false);

  const submit = async () => {
    if (!title || !date) { setStatus('Fill in title and date'); return; }
    setStatus(gcalConnected ? 'Adding to Google Calendar…' : 'Saving…');

    let googleId = null;
    try {
      if (gcalConnected && userId) {
        const result = await addCalendarEvent({ title, date, time: startTime, endTime, notes, userId, profileId });
        googleId = result?.id || null;
        setStatus('Added to Google Calendar!');
      } else {
        setStatus('Saved! Sign in with Google to sync to Calendar.');
      }
    } catch (e) {
      setStatus('Saved — Google Calendar sync failed');
    }

    setDone(true);
    onAdded({ title, date, time: startTime, endTime, googleId, added: true, fromGoogle: !!googleId, activityId: activity?.id, activityType: activity?.content_type });
    setTimeout(onClose, 1600);
  };

  const inp = {
    width:'100%', padding:'7px 10px', borderRadius:8,
    border:'0.5px solid rgba(255,255,255,.12)', fontSize:12,
    background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)',
    fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box',
    colorScheme:'dark',
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70, padding:16 }}>
      <div style={{ background:'#252220', borderRadius:14, border:'0.5px solid rgba(255,255,255,.1)', padding:20, width:320, maxWidth:'100%' }}>
        <div className="serif" style={{ fontSize:17, color:'rgba(255,255,255,.9)', fontWeight:300, marginBottom:4 }}>Add to calendar</div>
        <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', marginBottom:14 }}>
          {activity?.where || activity?.venue} · {activity?.cost || activity?.cost_display}
        </div>

        <div style={{ marginBottom:9 }}>
          <label style={{ fontSize:11, color:'rgba(255,255,255,.35)', display:'block', marginBottom:3 }}>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={inp} />
        </div>
        <div style={{ marginBottom:9 }}>
          <label style={{ fontSize:11, color:'rgba(255,255,255,.35)', display:'block', marginBottom:3 }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:9 }}>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.35)', display:'block', marginBottom:3 }}>Start time</label>
            <input type="time" value={startTime} onChange={e => { setStartTime(e.target.value); setEndTime(addHoursTo(e.target.value, 2)); }} style={inp} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.35)', display:'block', marginBottom:3 }}>End time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ marginBottom:9 }}>
          <label style={{ fontSize:11, color:'rgba(255,255,255,.35)', display:'block', marginBottom:3 }}>Notes</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)} style={inp} />
        </div>

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
