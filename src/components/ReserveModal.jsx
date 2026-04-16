import { useState } from 'react';

const RESTAURANT_IDS = ['food','miss']; // categories that use OpenTable
const TICKET_IDS = ['sports','music','arts']; // categories that use StubHub

function getBookingType(act) {
  if (act.tags?.includes('baseball') || act.tags?.includes('MLS') || act.tags?.includes('NBA') ||
      act.tags?.includes('arena') || act.tags?.includes('theater') || act.tags?.includes('live') ||
      act.tags?.includes('orchestra')) return 'tickets';
  return 'table';
}

export default function ReserveModal({ activity, catId, onClose }) {
  const type = getBookingType(activity);
  const [step, setStep] = useState(1); // 1=select, 2=confirm, 3=done
  const [party, setParty] = useState(2);
  const [time, setTime] = useState('7:00 PM');
  const [date, setDate] = useState('Sat Apr 12');

  const times = type === 'table'
    ? ['5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM']
    : ['General Admission','Section 101 Row C','Section 114 Row F','VIP Floor'];

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,.55)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:70, padding:20,
    }} onClick={onClose}>
      <div className="scale-enter" onClick={e => e.stopPropagation()} style={{
        background:'#1C1A17', borderRadius:14,
        border:'0.5px solid rgba(255,255,255,.1)',
        width:320, maxWidth:'100%', overflow:'hidden',
      }}>
        {/* Header */}
        <div style={{ padding:'14px 18px', borderBottom:'0.5px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:12, color: type==='table' ? '#34D399' : '#60A5FA', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:2 }}>
              {type === 'table' ? '🍽 OpenTable' : '🎟 StubHub'}
            </div>
            <div className="serif" style={{ fontSize:16, color:'rgba(255,255,255,.9)', fontWeight:300 }}>
              {activity.title}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:8, padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif', color:'rgba(255,255,255,.5)' }}>✕</button>
        </div>

        {step === 1 && (
          <div style={{ padding:'16px 18px' }}>
            {/* Party size */}
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:8, letterSpacing:'.05em', textTransform:'uppercase', fontSize:10 }}>
                {type === 'table' ? 'Party size' : 'Tickets'}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {[1,2,3,4,5,6].map(n => (
                  <button key={n} onClick={() => setParty(n)} style={{
                    width:36, height:36, borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)',
                    background: party===n ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.05)',
                    color: party===n ? '#C9A84C' : 'rgba(255,255,255,.6)',
                    cursor:'pointer', fontSize:13, fontWeight:500, fontFamily:'DM Sans, sans-serif',
                    transition:'all .12s',
                  }}>{n}</button>
                ))}
              </div>
            </div>

            {/* Time / section */}
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.4)', marginBottom:8, letterSpacing:'.05em', textTransform:'uppercase' }}>
                {type === 'table' ? 'Available times · Sat Apr 12' : 'Sections available'}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {times.map(t => (
                  <button key={t} onClick={() => setTime(t)} style={{
                    padding:'8px 6px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)',
                    background: time===t ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.05)',
                    color: time===t ? '#34D399' : 'rgba(255,255,255,.6)',
                    cursor:'pointer', fontSize:12, fontFamily:'DM Sans, sans-serif',
                    transition:'all .12s', textAlign:'center',
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setStep(2)} style={{
              width:'100%', padding:11, borderRadius:10,
              background: type==='table' ? 'rgba(52,211,153,.2)' : 'rgba(96,165,250,.2)',
              color: type==='table' ? '#34D399' : '#60A5FA',
              border: type==='table' ? '0.5px solid rgba(52,211,153,.3)' : '0.5px solid rgba(96,165,250,.3)',
              fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'DM Sans, sans-serif',
            }}>
              Continue → {party} {party===1?'guest':'guests'} · {time}
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ padding:'16px 18px' }}>
            <div style={{ background:'rgba(255,255,255,.04)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.6)', marginBottom:6, lineHeight:1.6 }}>
                <div><strong style={{ color:'rgba(255,255,255,.8)' }}>{activity.title}</strong></div>
                <div>{activity.where}</div>
                <div>Sat Apr 12 · {time} · {party} {party===1?'guest':'guests'}</div>
                <div style={{ color:'rgba(201,168,76,.8)', marginTop:4 }}>
                  {type==='table' ? 'Reservation via OpenTable — free to cancel' : `~${activity.cost} · via StubHub`}
                </div>
              </div>
            </div>

            {type==='tickets' && (
              <div style={{ background:'rgba(255,165,0,.08)', border:'0.5px solid rgba(255,165,0,.2)', borderRadius:8, padding:'8px 12px', marginBottom:14, fontSize:11, color:'rgba(255,200,100,.7)' }}>
                Mock booking — real StubHub integration coming soon
              </div>
            )}

            <div style={{ display:'flex', gap:7 }}>
              <button onClick={() => setStep(1)} style={{ flex:1, padding:9, borderRadius:9, background:'transparent', border:'0.5px solid rgba(255,255,255,.12)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif', color:'rgba(255,255,255,.4)' }}>Back</button>
              <button onClick={() => setStep(3)} style={{
                flex:2, padding:9, borderRadius:9, fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif',
                background: type==='table' ? 'rgba(52,211,153,.25)' : 'rgba(96,165,250,.25)',
                color: type==='table' ? '#34D399' : '#60A5FA',
                border: type==='table' ? '0.5px solid rgba(52,211,153,.3)' : '0.5px solid rgba(96,165,250,.3)',
              }}>
                {type==='table' ? 'Confirm reservation' : 'Purchase tickets'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ padding:'24px 18px', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>{type==='table' ? '✅' : '🎟'}</div>
            <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,.9)', marginBottom:6 }}>
              {type==='table' ? 'Reservation confirmed!' : 'Tickets reserved!'}
            </div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.4)', lineHeight:1.6, marginBottom:16 }}>
              {activity.title}<br />
              Sat Apr 12 · {time} · {party} {party===1?'guest':'guests'}<br />
              <span style={{ color:'rgba(201,168,76,.7)', fontSize:11, marginTop:4, display:'block' }}>
                Confirmation sent to your email
              </span>
            </div>
            <button onClick={onClose} style={{
              padding:'9px 24px', borderRadius:99,
              background:'rgba(255,255,255,.08)', border:'0.5px solid rgba(255,255,255,.12)',
              fontSize:13, color:'rgba(255,255,255,.7)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
            }}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
