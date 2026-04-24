import { useState } from 'react';
import { WEEKDAY_ACTIVITIES, WEEKDAY_CATEGORIES, WEEKDAY_PROMPTS, WEEKDAY_SPOTLIGHT, CALENDAR_EVENTS, WEATHER, PROFILE_COLORS } from '../data/content';
import { postFeedback } from '../lib/api';

function ActCard({ act, onCal, onRemove, onHeart, onThumbDown }) {
  const [heartMsg, setHeartMsg] = useState(null);
  const [thumbMsg, setThumbMsg] = useState(null);

  return (
    <div style={{
      background:'#fff', border:'0.5px solid rgba(0,0,0,.07)', borderRadius:10,
      padding:'12px 13px', display:'flex', flexDirection:'column', gap:5,
    }}>
      <div style={{ fontSize:13, fontWeight:600, lineHeight:1.3, color:'#1C1A17' }}>{act.title}</div>
      <div style={{ fontSize:11, color:'#8A8378', lineHeight:1.4 }}>
        {act.when} · {act.where} · <strong style={{ color:'#5A5550', fontWeight:500 }}>{act.cost}</strong>
      </div>
      <div style={{ fontSize:11, color:'#6A6560', fontStyle:'italic', lineHeight:1.5 }}>{act.why}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:3, marginTop:1 }}>
        {act.tags?.map(t => (
          <span key={t} style={{ fontSize:10, padding:'1px 6px', borderRadius:99, background:'rgba(0,0,0,.05)', color:'#8A8378', border:'0.5px solid rgba(0,0,0,.08)' }}>{t}</span>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:3 }}>
        <ActionBtn icon="📅" hover="#E8F5EC" title="Add to calendar" onClick={() => onCal(act)} />
        {act.reservable && <ActionBtn icon="🎟" hover="#DBEAFE" title="Reserve" onClick={() => {}} />}
        <ActionBtn icon="✕" hover="#FFF1F2" title="Remove" small onClick={() => onRemove(act)} />
        <div style={{ flex:1 }} />
        {heartMsg
          ? <span style={{ fontSize:11, color:'#1A6332', fontStyle:'italic' }}>{heartMsg}</span>
          : <ActionBtn icon="♥" hover="#FFF1F2" title="Save" onClick={() => { onHeart(act); setHeartMsg('Saved!'); setTimeout(() => setHeartMsg(null), 2000); }} />
        }
        {thumbMsg
          ? <span style={{ fontSize:11, color:'#9A3412', fontStyle:'italic' }}>{thumbMsg}</span>
          : <>
              <ActionBtn icon="👍" hover="#E8F5EC" title="More like this" onClick={() => { setThumbMsg("We'll show more like this"); setTimeout(() => setThumbMsg(null), 2500); }} />
              <ActionBtn icon="👎" hover="#FFF1F2" title="Less like this" onClick={() => { onThumbDown(act); setThumbMsg("Got it, less of this"); setTimeout(() => setThumbMsg(null), 2500); }} />
            </>
        }
      </div>
    </div>
  );
}

function ActionBtn({ icon, hover, title, onClick, small }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} title={title} style={{
      width: small?24:28, height: small?24:28, borderRadius:8,
      border:'0.5px solid rgba(0,0,0,.12)', background: h ? hover : 'transparent',
      cursor:'pointer', fontSize: small?11:14,
      display:'flex', alignItems:'center', justifyContent:'center',
      transition:'background .12s', fontFamily:'DM Sans, sans-serif', fontWeight:600,
    }}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
    >{icon}</button>
  );
}

export default function WeekdayMode({ settings, activeProfile, calQueue, activities: liveActivities, onCalendar, onSettings, onWeather, onAmbient, onSwitchProfile, onSaveItem, onShowSaved, onThumbUp, onThumbDown }) {
  // Merge live activities over mock data — live wins when available
  const mergedActivities = liveActivities
    ? { ...WEEKDAY_ACTIVITIES, ...liveActivities }
    : WEEKDAY_ACTIVITIES;
  const [activeCat, setActiveCat] = useState('all');
  const [aiPrompt, setAiPrompt]   = useState(null);
  const [spotRemoved, setSpotRemoved] = useState(false);
  const [colPage, setColPage] = useState(0);

  const profileColor = PROFILE_COLORS.find(c => c.id === activeProfile?.colorId) || PROFILE_COLORS[0];

  const today = new Date();
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayName = days[today.getDay()];
  const isWeekend = today.getDay() === 0 || today.getDay() === 6;

  const visibleCats = activeCat === 'all' ? WEEKDAY_CATEGORIES : WEEKDAY_CATEGORIES.filter(c => c.id === activeCat);
  const COLS_PER_PAGE = 4;
  const numPages = Math.ceil(visibleCats.length / COLS_PER_PAGE);
  const pageCats = visibleCats.slice(colPage * COLS_PER_PAGE, colPage * COLS_PER_PAGE + COLS_PER_PAGE);

  const allEvents = [...CALENDAR_EVENTS, ...calQueue.map(e => ({
    day: new Date(e.date+'T12:00').toLocaleDateString('en-US',{weekday:'short'}),
    name:e.title, time:e.time, added:true,
  }))];

  return (
    <div className="fade-enter" style={{ display:'grid', gridTemplateRows:'auto auto auto auto 1fr auto', height:'100%', background:'#F4F1EB', overflow:'hidden' }}>

      {/* Feature coming soon banner */}
      <div style={{ background:'rgba(147,124,215,0.15)', borderBottom:'0.5px solid rgba(147,124,215,.3)', padding:'10px 18px', display:'flex', alignItems:'center', justifyContent:'center', gap:10 }}>
        <span style={{ fontSize:16 }}>🚧</span>
        <div style={{ textAlign:'center' }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#C4B5FD', fontFamily:'DM Sans, sans-serif' }}>Weeknight Mode — Coming Soon</div>
          <div style={{ fontSize:11, color:'rgba(196,181,253,.6)', fontFamily:'DM Sans, sans-serif' }}>Weeknight event discovery is in development. Check back soon!</div>
        </div>
      </div>

      {/* Header */}
      <div style={{ background:'#1C1A17', padding:'9px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span className="serif" style={{ fontSize:20, color:'rgba(255,255,255,.9)', fontWeight:300, letterSpacing:'.06em' }}>Locale</span>
          <span style={{ fontSize:11, padding:'2px 9px', borderRadius:99, background:'rgba(147,124,215,0.25)', color:'#C4B5FD', fontWeight:600, letterSpacing:'.06em', fontSize:10, textTransform:'uppercase' }}>
            Weeknight
          </span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,.28)' }}>{isWeekend ? 'Plan your week' : `${dayName} evening`}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <button onClick={onShowSaved} style={{ fontSize:11, padding:'5px 11px', borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.55)', fontFamily:'DM Sans, sans-serif' }}>♥ Saved</button>
          <button onClick={onSwitchProfile} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 11px', borderRadius:8, cursor:'pointer', background:`${profileColor.border}`, border:`0.5px solid ${profileColor.border}`, fontFamily:'DM Sans, sans-serif' }}>
            <div style={{ width:18, height:18, borderRadius:'50%', background:profileColor.hex, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'white', fontWeight:600 }}>{activeProfile?.name?.charAt(0)||'A'}</div>
            <span style={{ fontSize:11, color:profileColor.light, fontWeight:500 }}>{activeProfile?.name}</span>
            <span style={{ fontSize:10, color:`${profileColor.light}88` }}>▾</span>
          </button>
          <button onClick={onSettings} style={{ fontSize:11, padding:'5px 11px', borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.55)', fontFamily:'DM Sans, sans-serif' }}>Settings</button>
          <button onClick={onAmbient} style={{ fontSize:11, padding:'5px 11px', borderRadius:8, cursor:'pointer', background:'rgba(201,168,76,.14)', border:'0.5px solid rgba(201,168,76,.3)', color:'#C9A84C', fontFamily:'DM Sans, sans-serif' }}>Ambient</button>
        </div>
      </div>

      {/* Quick prompts */}
      <div style={{ background:'#252220', padding:'7px 18px', display:'flex', alignItems:'center', gap:8 }}>
        <div style={{ width:26, height:26, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0, animation:'mic-pulse 2s ease-in-out infinite', cursor:'pointer' }}>🎤</div>
        <div style={{ display:'flex', gap:5, overflowX:'auto', flex:1 }} className="no-scroll">
          {WEEKDAY_PROMPTS.map(p => (
            <button key={p.label} onClick={() => setAiPrompt(p)} style={{
              fontSize:11, padding:'5px 12px', borderRadius:99, whiteSpace:'nowrap',
              background:'rgba(255,255,255,.09)', border:'0.5px solid rgba(255,255,255,.14)',
              color:'rgba(255,255,255,.7)', cursor:'pointer', fontFamily:'DM Sans, sans-serif', fontWeight:500, transition:'all .15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(201,168,76,.2)';e.currentTarget.style.color='#C9A84C';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.09)';e.currentTarget.style.color='rgba(255,255,255,.7)';}}
            >{p.label}</button>
          ))}
        </div>
      </div>

      {/* Compact weather */}
      <div style={{ background:'#fff', borderBottom:'0.5px solid rgba(0,0,0,.08)', display:'flex' }}>
        {WEATHER.slice(1,5).map((d,i) => (
          <button key={d.day} onClick={() => onWeather(i+1)} style={{
            flex:1, padding:'5px 10px', display:'flex', alignItems:'center', gap:7,
            background:'transparent', border:'none', borderRight: i<3 ? '0.5px solid rgba(0,0,0,.08)' : 'none',
            cursor:'pointer', fontFamily:'DM Sans, sans-serif', transition:'background .12s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#F4F1EB'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'#8A8378', width:26 }}>{d.day}</span>
            <span style={{ fontSize:16 }}>{d.icon}</span>
            <span style={{ fontSize:12, fontWeight:600, color:'#1C1A17' }}>{d.hi}°</span>
            <span style={{ fontSize:11, color:'#B8B3AA', flex:1, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.desc}</span>
          </button>
        ))}
      </div>

      {/* Main columns */}
      <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(pageCats.length,4)}, minmax(0,1fr)) 186px`, overflow:'hidden', minHeight:0 }}>
        {pageCats.map(cat => {
          const acts = mergedActivities[cat.id] || [];
          return (
            <div key={cat.id} style={{ display:'flex', flexDirection:'column', borderRight:'0.5px solid rgba(0,0,0,.07)', minWidth:0, overflow:'hidden' }}>
              <div className={cat.cls} style={{ padding:'9px 13px 8px', display:'flex', alignItems:'center', gap:7, flexShrink:0 }}>
                <span style={{ fontSize:15 }}>{cat.icon}</span>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', flex:1 }}>{cat.label}</span>
                <span style={{ fontSize:10, opacity:.5 }}>{acts.length}</span>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:'8px 8px 0', display:'flex', flexDirection:'column', gap:7 }} className="no-scroll">
                {acts.map(a => (
                  <ActCard
                    key={a.title}
                    act={a}
                    onCal={onCalendar}
                    onRemove={() => {}}
                    onHeart={item => onSaveItem({ ...item, catId: cat.id })}
                    onThumbDown={(act) => { onThumbDown?.('weekday', act); }}
                  />
                ))}
              </div>
              <div style={{ height:8, flexShrink:0 }} />
            </div>
          );
        })}

        {/* Sidebar */}
        <div style={{ background:'#1C1A17', display:'flex', flexDirection:'column', overflow:'hidden', borderLeft:'0.5px solid rgba(255,255,255,.06)' }}>
          <div style={{ padding:'11px 13px', borderBottom:'0.5px solid rgba(255,255,255,.07)', flexShrink:0, overflowY:'auto', maxHeight:'45%' }} className="no-scroll">
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#C9A84C', marginBottom:9 }}>This week</div>
            {allEvents.map((e,i) => (
              <div key={i} style={{ marginBottom:8, paddingLeft:8, borderLeft:'2px solid rgba(201,168,76,.4)' }}>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', color:'rgba(255,255,255,.22)', marginBottom:1 }}>{e.day}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.78)', fontWeight:500 }}>{e.name}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.28)' }}>{e.time}</div>
              </div>
            ))}
          </div>

          {!spotRemoved && (
            <div style={{ padding:'11px 13px', flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:7 }}>
                <div style={{ width:5, height:5, borderRadius:'50%', background:'#C9A84C', animation:'blink 2s ease-in-out infinite' }} />
                <span style={{ fontSize:9, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#C9A84C' }}>Tonight's pick</span>
              </div>
              <div className="serif" style={{ fontSize:14, color:'rgba(255,255,255,.88)', lineHeight:1.25, marginBottom:4, fontWeight:300 }}>{WEEKDAY_SPOTLIGHT.title}</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.38)', lineHeight:1.55, marginBottom:8 }}>{WEEKDAY_SPOTLIGHT.desc}</div>
              <div style={{ display:'flex', gap:5 }}>
                <button onClick={() => onCalendar(WEEKDAY_SPOTLIGHT)} style={{ fontSize:10, padding:'4px 9px', borderRadius:99, cursor:'pointer', background:'rgba(201,168,76,.15)', color:'#C9A84C', border:'0.5px solid rgba(201,168,76,.3)', fontFamily:'DM Sans, sans-serif' }}>+ Add</button>
                <button onClick={() => setSpotRemoved(true)} style={{ fontSize:10, padding:'4px 9px', borderRadius:99, cursor:'pointer', background:'transparent', color:'rgba(255,255,255,.28)', border:'0.5px solid rgba(255,255,255,.1)', fontFamily:'DM Sans, sans-serif' }}>✕</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:'#F4F1EB', borderTop:'0.5px solid rgba(0,0,0,.08)', padding:'6px 18px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', gap:4 }}>
          {[{id:'all',label:'All',icon:'🕯'},...WEEKDAY_CATEGORIES].map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)} style={{
              fontSize:11, padding:'4px 11px', borderRadius:99, cursor:'pointer',
              background: activeCat===c.id ? '#1C1A17' : 'transparent',
              color:      activeCat===c.id ? 'rgba(255,255,255,.85)' : '#8A8378',
              border:     activeCat===c.id ? 'none' : '0.5px solid rgba(0,0,0,.12)',
              fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}>{c.icon ? `${c.icon} ` : ''}{c.label}</button>
          ))}
        </div>
        <span style={{ fontSize:10, color:'#B8B3AA' }}>Mon–Thu evenings · 6–10pm</span>
      </div>

      {/* AI prompt modal */}
      {aiPrompt && <WeekdayAIModal prompt={aiPrompt} onClose={() => setAiPrompt(null)} />}
    </div>
  );
}

function WeekdayAIModal({ prompt, onClose }) {
  const responses = {
    'Plan our evening': { title:'Your evening plan', items:[{time:'6:30pm',icon:'🍜',title:'Quick dinner at Takorean',detail:'Multiple locations · $13 · Fast and satisfying'},{time:'7:30pm',icon:'🎵',title:'Kennedy Center Millennium Stage',detail:'Free · 30 min show · Home by 9:30'}], note:'Low commitment, high quality.' },
    'Quick dinner & home': { title:'Quick dinner options', items:[{time:'6:30pm',icon:'🍕',title:'Timber Pizza slice',detail:'Petworth · $14 · In and out in 30 min'},{time:'6:30pm',icon:'🍜',title:'Takorean bibimbap',detail:'Multiple DC · $13 · Genuinely good fast-casual'}], note:'Timber Pizza is the move if you want to be home by 8.' },
    'Something low-key': { title:'Low-key tonight', items:[{time:'7pm',icon:'📚',title:"Kramerbooks wine + browse",detail:'Dupont Circle · $ · Walk-in, relaxed, no planning needed'},{time:'7pm',icon:'🎵',title:'Kennedy Center free concert',detail:'Free · Always something on'}], note:'No reservations, no stress.' },
    'Active after work': { title:'Active weeknight', items:[{time:'6pm',icon:'🧘',title:'CorePower yoga',detail:'Multiple DC/NoVA · $20 · First class free'},{time:'6:30pm',icon:'🏃',title:'W&OD trail run',detail:'Near Falls Church · Free · Well-lit, 2 min away'}], note:"W&OD is right there — don't overthink it." },
    'Spontaneous date': { title:'Spontaneous date', items:[{time:'7pm',icon:'📚',title:"Kramerbooks then Madam's Organ",detail:'Dupont → Adams Morgan · $+$10 · No bookings, just go'},{time:'7pm',icon:'🎱',title:'Penn Social rooftop',detail:'Penn Quarter · Walk-in darts and shuffleboard'}], note:"Kramerbooks + Madam's Organ is the classic spontaneous combo." },
  };
  const r = responses[prompt.label] || { title: prompt.label, items: [], note: 'Coming soon.' };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70, padding:20 }} onClick={onClose}>
      <div className="scale-enter" onClick={e=>e.stopPropagation()} style={{ background:'#1C1A17', borderRadius:14, border:'0.5px solid rgba(255,255,255,.1)', width:480, maxWidth:'100%', maxHeight:'80vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
        <div style={{ padding:'13px 17px', borderBottom:'0.5px solid rgba(255,255,255,.08)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:10, color:'#C9A84C', fontWeight:600, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:2 }}>🎤 Locale AI</div>
            <div className="serif" style={{ fontSize:17, color:'rgba(255,255,255,.9)', fontWeight:300 }}>{r.title}</div>
          </div>
          <button onClick={onClose} style={{ background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.1)', borderRadius:7, padding:'4px 10px', fontSize:12, cursor:'pointer', fontFamily:'DM Sans,sans-serif', color:'rgba(255,255,255,.5)' }}>Done</button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'14px 17px' }} className="no-scroll">
          {r.items.map((item,i) => (
            <div key={i} style={{ display:'flex', gap:12, padding:'10px 12px', background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.07)', borderRadius:9, marginBottom:8 }}>
              <div style={{ flexShrink:0, textAlign:'center' }}>
                <div style={{ fontSize:20, marginBottom:3 }}>{item.icon}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', whiteSpace:'nowrap' }}>{item.time}</div>
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.85)', marginBottom:2 }}>{item.title}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', lineHeight:1.5 }}>{item.detail}</div>
              </div>
            </div>
          ))}
          {r.note && <div style={{ padding:'10px 12px', background:'rgba(201,168,76,.1)', border:'0.5px solid rgba(201,168,76,.2)', borderRadius:8, fontSize:12, color:'rgba(201,168,76,.85)' }}>💡 {r.note}</div>}
        </div>
      </div>
    </div>
  );
}
