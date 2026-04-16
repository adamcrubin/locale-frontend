import { useState } from 'react';
import { ALL_CATEGORIES, PREFERENCES, PROFILE_COLORS } from '../data/content';

// ── Demo preset ───────────────────────────────────────────────────────────────
const DEMO_PRESET = {
  householdName: 'The Crubin Household',
  city: 'Falls Church, VA',
  profiles: [
    {
      id: 'p1', name: 'Adam', colorId: 'teal',
      aboutMe: "Live near Lake Barcroft in Falls Church with my partner Kailee and our English Cream Golden Retriever, Harlow. Love Middle Eastern food, live jazz, hiking, and nerdy bar events. Budget ~$50pp.",
      prefs: ['Dog lover','Adventurous food','Mediterranean food','Local & indie','Jazz & blues'],
      budget: 2,
      categoryStates: { outdoors:'always', food:'always', arts:'always', music:'always', sports:'sometimes', miss:'always', away:'sometimes', trips:'sometimes', nerdy:'always' },
    },
    {
      id: 'p2', name: 'Kailee', colorId: 'rose',
      aboutMe: "Prefer upscale, indoor experiences — nice restaurants, theater, museums, and art. Love brunch and date nights.",
      prefs: ['Date night vibes','Wine enthusiast','Art lover','Instagrammable spots','Foodie splurges'],
      budget: 3,
      categoryStates: { outdoors:'sometimes', food:'always', arts:'always', music:'sometimes', sports:'never', miss:'always', away:'always', trips:'sometimes', nerdy:'sometimes' },
    },
  ],
};

// ── Step indicators ───────────────────────────────────────────────────────────
function Steps({ current, total }) {
  return (
    <div style={{ display:'flex', gap:6, justifyContent:'center', marginBottom:28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          height: 3, borderRadius: 99,
          width: i === current ? 24 : 8,
          background: i <= current ? '#C9A84C' : 'rgba(255,255,255,.15)',
          transition: 'all .3s',
        }} />
      ))}
    </div>
  );
}

// ── Step 1: Household name + city ─────────────────────────────────────────────
function StepLocation({ data, onChange, onNext }) {
  const [name, setName] = useState(data.householdName || '');
  const [city, setCity] = useState(data.city || '');

  const inp = {
    width:'100%', padding:'11px 14px', borderRadius:10,
    border:'0.5px solid rgba(255,255,255,.15)',
    background:'rgba(255,255,255,.07)', color:'rgba(255,255,255,.9)',
    fontSize:14, fontFamily:'DM Sans, sans-serif', outline:'none',
    boxSizing:'border-box', transition:'border-color .15s',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:26, fontWeight:300, color:'rgba(255,255,255,.95)', marginBottom:8, lineHeight:1.2 }}>
        Welcome to Locale
      </div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:28, lineHeight:1.6 }}>
        Your personal weekend discovery app. Let's set up your household in 60 seconds.
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:7 }}>Household name</div>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. The Smith Household"
            style={inp}
            onFocus={e => e.target.style.borderColor='rgba(201,168,76,.5)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,.15)'}
          />
          <div style={{ fontSize:10, color:'rgba(255,255,255,.22)', marginTop:5 }}>Just a name for this household — only you'll see it</div>
        </div>

        <div>
          <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:7 }}>Your city</div>
          <input value={city} onChange={e => setCity(e.target.value)}
            placeholder="e.g. Falls Church, VA or 22046"
            style={inp}
            onFocus={e => e.target.style.borderColor='rgba(201,168,76,.5)'}
            onBlur={e => e.target.style.borderColor='rgba(255,255,255,.15)'}
          />
          <div style={{ fontSize:10, color:'rgba(255,255,255,.22)', marginTop:5 }}>City name or ZIP — used to find local events and weather</div>
        </div>
      </div>

      {/* Quick city picks */}
      <div style={{ marginTop:14 }}>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginBottom:8 }}>Quick pick:</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
          {['Falls Church, VA','Washington, DC','Arlington, VA','Alexandria, VA','Bethesda, MD'].map(c => (
            <button key={c} onClick={() => setCity(c)} style={{
              fontSize:11, padding:'4px 10px', borderRadius:99, cursor:'pointer',
              background: city===c ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.06)',
              border: `0.5px solid ${city===c ? 'rgba(201,168,76,.4)' : 'rgba(255,255,255,.1)'}`,
              color: city===c ? '#C9A84C' : 'rgba(255,255,255,.5)',
              fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}>{c}</button>
          ))}
        </div>
      </div>

      <button onClick={() => { onChange({ householdName:name, city }); onNext(); }}
        disabled={!city.trim()}
        style={{
          marginTop:28, width:'100%', padding:13, borderRadius:10,
          background:'rgba(201,168,76,.25)', border:'0.5px solid rgba(201,168,76,.4)',
          color:'#C9A84C', fontSize:14, fontWeight:600, cursor:'pointer',
          fontFamily:'DM Sans, sans-serif', opacity:city.trim()?1:0.4, transition:'opacity .15s',
        }}>
        Continue →
      </button>
    </div>
  );
}

// ── Step 2: Profile setup ─────────────────────────────────────────────────────
function StepProfiles({ data, onChange, onNext, onBack }) {
  const [profiles, setProfiles] = useState(data.profiles || [
    { id:'p1', name:'', colorId:'teal', prefs:[], budget:2,
      aboutMe:'', savedItems:[],
      categoryStates:{ outdoors:'always', food:'always', arts:'always', music:'always', sports:'sometimes', miss:'always', away:'sometimes', trips:'sometimes', nerdy:'sometimes' },
    }
  ]);
  const [editingIdx, setEditingIdx] = useState(0);

  const profile = profiles[editingIdx];

  const updateProfile = (patch) => {
    setProfiles(ps => ps.map((p,i) => i===editingIdx ? {...p,...patch} : p));
  };

  const addProfile = () => {
    if (profiles.length >= 4) return;
    const usedColors = profiles.map(p => p.colorId);
    const nextColor = PROFILE_COLORS.find(c => !usedColors.includes(c.id))?.id || 'violet';
    const newProfile = {
      id: `p${Date.now()}`, name:'', colorId:nextColor, prefs:[], budget:2,
      aboutMe:'', savedItems:[],
      categoryStates:{ outdoors:'always', food:'always', arts:'always', music:'always', sports:'sometimes', miss:'always', away:'sometimes', trips:'sometimes', nerdy:'sometimes' },
    };
    setProfiles(ps => [...ps, newProfile]);
    setEditingIdx(profiles.length);
  };

  const removeProfile = (idx) => {
    if (profiles.length <= 1) return;
    setProfiles(ps => ps.filter((_,i) => i!==idx));
    setEditingIdx(Math.max(0, editingIdx-1));
  };

  const togglePref = (pref) => {
    const current = profile.prefs || [];
    updateProfile({ prefs: current.includes(pref) ? current.filter(p=>p!==pref) : [...current, pref] });
  };

  const inp = {
    width:'100%', padding:'9px 12px', borderRadius:9,
    border:'0.5px solid rgba(255,255,255,.12)',
    background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.9)',
    fontSize:13, fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:26, fontWeight:300, color:'rgba(255,255,255,.95)', marginBottom:6 }}>Who's in your household?</div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:20, lineHeight:1.6 }}>Add a profile for each person. Each gets personalized recommendations.</div>

      {/* Profile tabs */}
      <div style={{ display:'flex', gap:5, marginBottom:16, flexWrap:'wrap' }}>
        {profiles.map((p,i) => {
          const color = PROFILE_COLORS.find(c=>c.id===p.colorId)||PROFILE_COLORS[0];
          return (
            <button key={p.id} onClick={()=>setEditingIdx(i)} style={{
              display:'flex', alignItems:'center', gap:7,
              padding:'6px 12px', borderRadius:99, cursor:'pointer',
              background: editingIdx===i ? color.border : 'rgba(255,255,255,.06)',
              border:`0.5px solid ${editingIdx===i ? color.hex : 'rgba(255,255,255,.1)'}`,
              fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}>
              <div style={{ width:14, height:14, borderRadius:'50%', background:color.hex, flexShrink:0 }} />
              <span style={{ fontSize:12, color:editingIdx===i?color.light:'rgba(255,255,255,.5)', fontWeight:editingIdx===i?600:400 }}>
                {p.name||'Unnamed'}
              </span>
              {profiles.length>1&&<span onClick={e=>{e.stopPropagation();removeProfile(i);}} style={{fontSize:10,color:'rgba(255,255,255,.3)',marginLeft:2,cursor:'pointer'}}>✕</span>}
            </button>
          );
        })}
        {profiles.length < 4 && (
          <button onClick={addProfile} style={{
            padding:'6px 12px', borderRadius:99, cursor:'pointer', fontSize:12,
            background:'rgba(255,255,255,.04)', border:'0.5px dashed rgba(255,255,255,.15)',
            color:'rgba(255,255,255,.35)', fontFamily:'DM Sans, sans-serif',
          }}>+ Add person</button>
        )}
      </div>

      {/* Profile editor */}
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:5 }}>Name</div>
            <input value={profile.name} onChange={e=>updateProfile({name:e.target.value})} placeholder="Your name" style={inp} />
          </div>
          <div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:5 }}>Color</div>
            <div style={{ display:'flex', gap:5 }}>
              {PROFILE_COLORS.map(c => (
                <div key={c.id} onClick={()=>updateProfile({colorId:c.id})} style={{
                  width:24, height:24, borderRadius:'50%', background:c.hex,
                  cursor:'pointer', border:`2px solid ${profile.colorId===c.id?'white':'transparent'}`,
                  transition:'border .15s',
                }} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:5 }}>About you <span style={{opacity:.5}}>(optional)</span></div>
          <textarea value={profile.aboutMe} onChange={e=>updateProfile({aboutMe:e.target.value})}
            placeholder="What do you like? e.g. love hiking, brunch, live music, budget ~$50pp..."
            rows={2}
            style={{ ...inp, resize:'none', lineHeight:1.5 }}
          />
          <div style={{ fontSize:10, color:'rgba(255,255,255,.2)', marginTop:4 }}>Claude uses this to personalize your recommendations</div>
        </div>

        <div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:8 }}>Interests <span style={{opacity:.5}}>pick a few</span></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {PREFERENCES.map(pref => {
              const active = (profile.prefs||[]).includes(pref);
              return (
                <button key={pref} onClick={()=>togglePref(pref)} style={{
                  fontSize:11, padding:'4px 10px', borderRadius:99, cursor:'pointer',
                  background: active ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.05)',
                  border:`0.5px solid ${active ? 'rgba(201,168,76,.4)' : 'rgba(255,255,255,.1)'}`,
                  color: active ? '#C9A84C' : 'rgba(255,255,255,.45)',
                  fontFamily:'DM Sans, sans-serif', transition:'all .12s',
                }}>{pref}</button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:8 }}>Budget</div>
          <div style={{ display:'flex', gap:6 }}>
            {[['$','~$25/person',1],['$$','~$50/person',2],['$$$','~$100+/person',3]].map(([sym,label,val])=>(
              <button key={val} onClick={()=>updateProfile({budget:val})} style={{
                flex:1, padding:'8px', borderRadius:8, cursor:'pointer', textAlign:'center',
                background: profile.budget===val ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.05)',
                border:`0.5px solid ${profile.budget===val ? 'rgba(201,168,76,.35)' : 'rgba(255,255,255,.1)'}`,
                fontFamily:'DM Sans, sans-serif', transition:'all .15s',
              }}>
                <div style={{ fontSize:13, fontWeight:600, color:profile.budget===val?'#C9A84C':'rgba(255,255,255,.7)', marginBottom:2 }}>{sym}</div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:8, marginTop:24 }}>
        <button onClick={onBack} style={{
          padding:'10px 18px', borderRadius:10, cursor:'pointer',
          background:'transparent', border:'0.5px solid rgba(255,255,255,.12)',
          color:'rgba(255,255,255,.4)', fontSize:13, fontFamily:'DM Sans, sans-serif',
        }}>← Back</button>
        <button onClick={()=>{ onChange({ profiles }); onNext(); }}
          disabled={!profiles.some(p=>p.name.trim())}
          style={{
            flex:1, padding:13, borderRadius:10, cursor:'pointer',
            background:'rgba(201,168,76,.25)', border:'0.5px solid rgba(201,168,76,.4)',
            color:'#C9A84C', fontSize:14, fontWeight:600, fontFamily:'DM Sans, sans-serif',
            opacity:profiles.some(p=>p.name.trim())?1:0.4, transition:'opacity .15s',
          }}>
          Continue →
        </button>
      </div>
    </div>
  );
}

// ── Step 3: Category preferences ──────────────────────────────────────────────
function StepCategories({ data, onChange, onFinish, onBack }) {
  const profile = data.profiles?.[0] || {};
  const [states, setStates] = useState(
    profile.categoryStates || Object.fromEntries(ALL_CATEGORIES.map(c => [c.id, 'sometimes']))
  );

  const cycle = (id) => {
    const order = ['always','sometimes','never'];
    const next = order[(order.indexOf(states[id])+1) % order.length];
    setStates(s => ({...s, [id]: next}));
  };

  const stateStyle = {
    always:    { bg:'rgba(201,168,76,.15)',  border:'rgba(201,168,76,.35)',  color:'#C9A84C',              label:'Always' },
    sometimes: { bg:'rgba(255,255,255,.06)', border:'rgba(255,255,255,.12)', color:'rgba(255,255,255,.5)', label:'Sometimes' },
    never:     { bg:'rgba(159,18,57,.12)',   border:'rgba(253,164,175,.2)',  color:'rgba(253,164,175,.5)', label:'Never' },
  };

  const handleFinish = () => {
    // Apply category states to all profiles
    const updatedProfiles = (data.profiles||[]).map((p,i) => ({
      ...p,
      categoryStates: i===0 ? states : p.categoryStates,
    }));
    onChange({ profiles: updatedProfiles });
    onFinish();
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
      <div style={{ fontFamily:'Cormorant Garamond, serif', fontSize:26, fontWeight:300, color:'rgba(255,255,255,.95)', marginBottom:6 }}>What do you want to see?</div>
      <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:20, lineHeight:1.6 }}>
        Tap each category to set how often it appears. You can always change this later.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {ALL_CATEGORIES.map(cat => {
          const state = states[cat.id] || 'sometimes';
          const s = stateStyle[state];
          return (
            <button key={cat.id} onClick={()=>cycle(cat.id)} style={{
              display:'flex', alignItems:'center', gap:9, padding:'10px 12px',
              borderRadius:10, cursor:'pointer', textAlign:'left',
              background:s.bg, border:`0.5px solid ${s.border}`,
              fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            }}>
              <span style={{ fontSize:16, flexShrink:0 }}>{cat.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.8)', lineHeight:1.2 }}>{cat.label}</div>
                <div style={{ fontSize:10, color:s.color, marginTop:1 }}>{s.label}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ fontSize:10, color:'rgba(255,255,255,.2)', textAlign:'center', marginTop:14 }}>
        Tap to cycle: Always → Sometimes → Never
      </div>

      <div style={{ display:'flex', gap:8, marginTop:20 }}>
        <button onClick={onBack} style={{
          padding:'10px 18px', borderRadius:10, cursor:'pointer',
          background:'transparent', border:'0.5px solid rgba(255,255,255,.12)',
          color:'rgba(255,255,255,.4)', fontSize:13, fontFamily:'DM Sans, sans-serif',
        }}>← Back</button>
        <button onClick={handleFinish} style={{
          flex:1, padding:13, borderRadius:10, cursor:'pointer',
          background:'rgba(201,168,76,.25)', border:'0.5px solid rgba(201,168,76,.4)',
          color:'#C9A84C', fontSize:14, fontWeight:600, fontFamily:'DM Sans, sans-serif',
        }}>
          Let's go →
        </button>
      </div>
    </div>
  );
}

// ── Main onboarding component ─────────────────────────────────────────────────
export default function OnboardingFlow({ onComplete, showDemoButton = true }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState({
    householdName: '',
    city: '',
    profiles: [{
      id:'p1', name:'', colorId:'teal', prefs:[], budget:2, aboutMe:'', savedItems:[],
      categoryStates:{ outdoors:'always', food:'always', arts:'always', music:'always', sports:'sometimes', miss:'always', away:'sometimes', trips:'sometimes', nerdy:'sometimes' },
    }],
  });

  const merge = (patch) => setData(d => ({ ...d, ...patch }));

  const finish = () => {
    // Build final settings object
    const settings = {
      city:             data.city,
      householdName:    data.householdName,
      profiles:         data.profiles.map((p,i) => ({
        ...p,
        id: p.id || `p${i+1}`,
        savedItems: p.savedItems || [],
      })),
      activeProfileId:  data.profiles[0]?.id || 'p1',
      onboardingDone:   true,
    };
    onComplete(settings);
  };

  const loadDemo = () => {
    setData(DEMO_PRESET);
    // Skip to last step briefly, then finish
    setStep(2);
  };

  const TOTAL_STEPS = 3;

  return (
    <div style={{
      position:'fixed', inset:0, background:'#0f0d0b',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:20, fontFamily:'DM Sans, sans-serif', overflow:'auto',
    }}>
      {/* Background glow */}
      <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(201,168,76,.09) 0%, transparent 60%)', pointerEvents:'none' }} />

      <div style={{ width:'100%', maxWidth:480, position:'relative' }}>

        {/* Demo button — top right corner */}
        {showDemoButton && (
          <button onClick={loadDemo} style={{
            position:'absolute', top:-8, right:0, zIndex:10,
            fontSize:11, padding:'5px 12px', borderRadius:99,
            background:'rgba(201,168,76,.12)', border:'0.5px solid rgba(201,168,76,.25)',
            color:'rgba(201,168,76,.7)', cursor:'pointer', fontFamily:'DM Sans, sans-serif',
            letterSpacing:'.04em',
          }}>⚡ Demo</button>
        )}

        {/* Steps indicator */}
        <Steps current={step} total={TOTAL_STEPS} />

        {/* Step card */}
        <div style={{
          background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.09)',
          borderRadius:16, padding:28,
          animation:'fadeIn 250ms ease both',
        }}>
          {step === 0 && <StepLocation data={data} onChange={merge} onNext={()=>setStep(1)} />}
          {step === 1 && <StepProfiles data={data} onChange={merge} onNext={()=>setStep(2)} onBack={()=>setStep(0)} />}
          {step === 2 && <StepCategories data={data} onChange={merge} onFinish={finish} onBack={()=>setStep(1)} />}
        </div>

        <div style={{ textAlign:'center', marginTop:16, fontSize:11, color:'rgba(255,255,255,.18)' }}>
          Locale · Your household weekend planner
        </div>
      </div>
    </div>
  );
}
