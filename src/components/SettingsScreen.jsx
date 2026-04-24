import { useState } from 'react';
import { ALL_CATEGORIES, PREFERENCES, BUDGET_LEVELS, PROFILE_COLORS, DEFAULT_PROFILE } from '../data/content';
import ThemeToggle, { useTheme } from './ThemeToggle';

function Section({ title, desc, children }) {
  return (
    <div style={{ background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:11, padding:14, marginBottom:10 }}>
      <div style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.8)', marginBottom: desc ? 4 : 10 }}>{title}</div>
      {desc && <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:10 }}>{desc}</div>}
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label style={{ position:'relative', width:30, height:17, display:'inline-block', flexShrink:0, cursor:'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity:0,width:0,height:0,position:'absolute' }} />
      <span style={{ position:'absolute',inset:0,borderRadius:9,transition:'background .2s', background: checked ? '#1D9E75' : 'rgba(255,255,255,.2)' }}>
        <span style={{ position:'absolute',width:13,height:13,background:'white',borderRadius:'50%',top:2,left:checked?15:2,transition:'left .2s' }} />
      </span>
    </label>
  );
}

function Chip({ label, active, onToggle }) {
  return (
    <button onClick={onToggle} style={{
      fontSize:11, padding:'4px 10px', borderRadius:99, cursor:'pointer',
      border:'0.5px solid rgba(255,255,255,.12)',
      background: active ? 'rgba(201,168,76,.18)' : 'rgba(255,255,255,.05)',
      color:      active ? '#C9A84C'               : 'rgba(255,255,255,.4)',
      fontWeight: active ? 500 : 400,
      fontFamily:'DM Sans, sans-serif', transition:'all .15s',
    }}>{label}</button>
  );
}

function CatStateRow({ cat, state, onChange }) {
  const states = ['never','sometimes','always'];
  const labels = { never:'Never', sometimes:'Sometimes', always:'Always' };
  const colors = { never:'rgba(255,255,255,.2)', sometimes:'rgba(201,168,76,.4)', always:'#1D9E75' };
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,.07)', fontSize:12, color:'rgba(255,255,255,.65)' }}>
      <span>{cat.icon} {cat.label}</span>
      <div style={{ display:'flex', gap:4 }}>
        {states.map(s => (
          <button key={s} onClick={() => onChange(s)} style={{
            fontSize:10, padding:'2px 9px', borderRadius:99, cursor:'pointer',
            fontFamily:'DM Sans, sans-serif', transition:'all .15s',
            background: state === s ? colors[s] : 'rgba(255,255,255,.05)',
            color: state === s ? 'white' : 'rgba(255,255,255,.35)',
            border: `0.5px solid ${state===s ? colors[s] : 'rgba(255,255,255,.1)'}`,
            fontWeight: state===s ? 500 : 400,
          }}>{labels[s]}</button>
        ))}
      </div>
    </div>
  );
}

function ProfileEditor({ profile, onUpdate, onDelete, canDelete, profileColors }) {
  const [expanded, setExpanded] = useState(false);
  const color = profileColors.find(c => c.id === profile.colorId) || profileColors[0];
  const toggle = (arr, val) => arr.includes(val) ? arr.filter(x=>x!==val) : [...arr,val];
  const setCatState = (catId, state) => {
    const next = { ...(profile.categoryStates||{}), [catId]: state };
    onUpdate({ categoryStates: next });
  };

  return (
    <div style={{ background:'rgba(255,255,255,.04)', border:`0.5px solid ${color.border}`, borderRadius:10, marginBottom:8, overflow:'hidden' }}>
      <div onClick={() => setExpanded(e => !e)} style={{ padding:'11px 13px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
        <div style={{ width:32, height:32, borderRadius:'50%', background:color.hex, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, color:'white', fontWeight:600, flexShrink:0 }}>
          {profile.name.charAt(0)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,.85)' }}>{profile.name}</div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{profile.prefs?.slice(0,3).join(' · ')}</div>
        </div>
        <span style={{ fontSize:12, color:'rgba(255,255,255,.3)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding:'0 13px 13px', borderTop:'0.5px solid rgba(255,255,255,.07)' }}>
          <div style={{ marginBottom:10, marginTop:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>Name</label>
            <input value={profile.name} onChange={e => onUpdate({ name: e.target.value })} style={{
              width:'100%', padding:'6px 9px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)',
              fontSize:12, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)', fontFamily:'DM Sans, sans-serif', outline:'none',
            }} />
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:6 }}>Color</label>
            <div style={{ display:'flex', gap:8 }}>
              {profileColors.map(c => (
                <button key={c.id} onClick={() => onUpdate({ colorId: c.id })} style={{
                  width:28, height:28, borderRadius:'50%', background:c.hex,
                  border: profile.colorId===c.id ? `2px solid white` : '2px solid transparent',
                  cursor:'pointer', transition:'border .15s',
                }} />
              ))}
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>About me (AI uses this)</label>
            <textarea value={profile.aboutMe||''} onChange={e=>onUpdate({aboutMe:e.target.value})} rows={3} style={{
              width:'100%', padding:'6px 9px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)',
              fontSize:12, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)', fontFamily:'DM Sans, sans-serif', resize:'none', outline:'none', lineHeight:1.5,
            }} />
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:6 }}>Budget</label>
            <div style={{ display:'flex', gap:5 }}>
              {BUDGET_LEVELS.map(b => (
                <button key={b.value} onClick={() => onUpdate({budget:b.value})} style={{
                  flex:1, padding:'5px 2px', borderRadius:8, cursor:'pointer', textAlign:'center',
                  fontSize:11, fontFamily:'DM Sans, sans-serif', transition:'all .15s',
                  background: profile.budget===b.value ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.05)',
                  color: profile.budget===b.value ? '#C9A84C' : 'rgba(255,255,255,.4)',
                  border: profile.budget===b.value ? '0.5px solid rgba(201,168,76,.35)' : '0.5px solid rgba(255,255,255,.1)',
                }}>{b.symbol}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:6 }}>Preferences</label>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
              {PREFERENCES.map(p => (
                <Chip key={p} label={p}
                  active={(profile.prefs||[]).includes(p)}
                  onToggle={() => onUpdate({ prefs: toggle(profile.prefs||[], p) })}
                />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:6 }}>Category visibility</label>
            {ALL_CATEGORIES.map(cat => (
              <CatStateRow
                key={cat.id} cat={cat}
                state={(profile.categoryStates||{})[cat.id] || 'never'}
                onChange={state => setCatState(cat.id, state)}
              />
            ))}
          </div>

          {canDelete && (
            <button onClick={onDelete} style={{
              marginTop:12, fontSize:11, padding:'5px 12px', borderRadius:8,
              background:'rgba(190,18,60,.15)', color:'#FDA4AF', border:'0.5px solid rgba(190,18,60,.25)',
              cursor:'pointer', fontFamily:'DM Sans, sans-serif',
            }}>Delete profile</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SettingsScreen({ settings, onSave, activeProfile, updateProfile, addProfile, removeProfile, onClose, user, onSignOut, onShowSources, calendar }) {
  const [city,        setCity]       = useState(settings.city);
  const [homeAddress, setHomeAddress] = useState(settings.homeAddress || '');
  const [curatedMode, setCuratedMode] = useState(settings.curatedMode || false);
  const [testMode,    setTestMode]   = useState(settings.testMode || false);
  const { themeId, setTheme, currentTheme } = useTheme();

  const save = () => {
    onSave({ city, homeAddress, curatedMode, testMode });
    onClose();
  };

  const addNewProfile = () => {
    const colors = PROFILE_COLORS;
    const usedColors = settings.profiles.map(p => p.colorId);
    const nextColor = colors.find(c => !usedColors.includes(c.id)) || colors[0];
    addProfile({
      ...DEFAULT_PROFILE,
      id: `p${Date.now()}`,
      name: 'New profile',
      colorId: nextColor.id,
      prefs: [],
      savedItems: [],
      categoryStates: { outdoors:'always', food:'always', arts:'always', music:'always', sports:'sometimes', miss:'always' },
    });
  };

  const inpStyle = { width:'100%', padding:'7px 10px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)', fontSize:12, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)', fontFamily:'DM Sans, sans-serif', outline:'none' };
  const row = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,.07)', fontSize:12, color:'rgba(255,255,255,.65)' };

  return (
    <div className="fade-enter" style={{ position:'fixed', inset:0, background:'#141210', zIndex:60, overflowY:'auto', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#1C1A17', borderBottom:'0.5px solid rgba(255,255,255,.07)', padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span className="serif" style={{ fontSize:20, color:'rgba(255,255,255,.9)', fontWeight:300 }}>Settings</span>
        <button onClick={save} style={{ background:'rgba(26,99,50,.35)', color:'#6EE7A0', border:'0.5px solid rgba(110,231,160,.25)', borderRadius:8, padding:'6px 16px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>Save & close</button>
      </div>

      <div style={{ padding:16, flex:1 }}>

        {/* ── Location ── */}
        <Section title="Location">
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>City or ZIP <span style={{ color:'#C9A84C' }}>*</span></label>
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="Falls Church, VA or 22046" style={inpStyle} />
          </div>
          <div>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>Home address <span style={{ color:'rgba(255,255,255,.25)' }}>(optional)</span></label>
            <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="123 Main St, Falls Church, VA 22046" style={inpStyle} />
            <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginTop:4 }}>Used for directions and distance-based sorting.</div>
          </div>
        </Section>

        {/* ── Profiles ── */}
        <Section title="Profiles" desc="Up to 5 profiles — each has their own preferences, categories, and saved items.">
          {settings.profiles.map(p => (
            <ProfileEditor
              key={p.id}
              profile={p}
              onUpdate={patch => updateProfile(p.id, patch)}
              onDelete={() => removeProfile(p.id)}
              canDelete={settings.profiles.length > 1}
              profileColors={PROFILE_COLORS}
            />
          ))}
          {settings.profiles.length < 5 && (
            <button onClick={addNewProfile} style={{
              width:'100%', padding:'9px', borderRadius:9,
              background:'rgba(255,255,255,.05)', border:'0.5px solid rgba(255,255,255,.12)',
              color:'rgba(255,255,255,.5)', fontSize:12, cursor:'pointer', fontFamily:'DM Sans, sans-serif',
            }}>+ Add profile</button>
          )}
        </Section>

        {/* ── Look & Feel ── */}
        <Section title="Look & Feel">
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:8 }}>Theme</div>
            <ThemeToggle themeId={themeId} setTheme={setTheme} currentTheme={currentTheme} />
          </div>
          <div style={{ ...row, borderBottom:'none' }}>
            <div>
              <div>Curated mode</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:1 }}>Limit to max 5 activities per category</div>
            </div>
            <Toggle checked={curatedMode} onChange={e => setCuratedMode(e.target.checked)} />
          </div>
        </Section>

        {/* ── Data Sources (Admin) ── */}
        <Section title="Data Sources">
          {onShowSources && (
            <button onClick={() => { onClose(); onShowSources(); }} style={{
              display:'flex', alignItems:'center', gap:8,
              width:'100%', padding:'9px 12px', borderRadius:9, marginBottom:8,
              background:'rgba(255,255,255,.05)', border:'0.5px solid rgba(255,255,255,.12)',
              color:'rgba(255,255,255,.7)', fontSize:12, cursor:'pointer',
              fontFamily:'DM Sans, sans-serif', textAlign:'left',
            }}>
              📡 <span>Manage sources</span>
            </button>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <AdminButton
              label="🗑  Clear all events & re-extract"
              desc="Wipes DB, re-scrapes all sources, re-runs extraction. Takes 2-4 minutes."
              color="#F59E0B"
              dangerous
              onClick={async () => {
                if (!window.confirm('Delete ALL events and scraped content, then re-run the full pipeline?\n\nThis takes 2-4 minutes.')) return;
                const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                try {
                  alert('Step 1/3: Clearing database...');
                  const clr = await (await fetch(`${BASE}/admin/clear-events`, {method:'POST'})).json();
                  alert(`Cleared ${clr.eventsDeleted} events.\n\nStep 2/3: Scraping sources — takes 2-3 minutes.\nClick OK and wait.`);
                  await fetch(`${BASE}/admin/refresh/sources`, {method:'POST'});
                  let scraped = 0, start = Date.now();
                  while (scraped === 0 && Date.now() - start < 240000) {
                    await new Promise(r => setTimeout(r, 8000));
                    try { const c = await (await fetch(`${BASE}/admin/scraped?zip=22046`)).json(); scraped = c.scraped?.length || 0; } catch {}
                  }
                  if (scraped === 0) { alert('Scraping timed out — check Render logs.'); return; }
                  alert(`✓ Scraped ${scraped} sources.\n\nStep 3/3: Running extraction...`);
                  await fetch(`${BASE}/admin/extract`, {method:'POST'});
                  let events = 0, extStart = Date.now();
                  while (events === 0 && Date.now() - extStart < 120000) {
                    await new Promise(r => setTimeout(r, 5000));
                    try { const e = await (await fetch(`${BASE}/admin/events?zip=22046&limit=5`)).json(); events = e.count || 0; } catch {}
                  }
                  alert(`✓ Done! ${events} events in database. Reload to see new events.`);
                } catch (e) { alert('Pipeline failed: ' + e.message); }
              }}
            />
            <AdminButton
              label="🔄  Just re-extract (keep scraped HTML)"
              desc="Re-runs extraction on existing scraped content. Use if scraping already ran."
              color="#2563EB"
              onClick={async () => {
                const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                try {
                  const check = await (await fetch(`${BASE}/admin/scraped?zip=22046`)).json();
                  const sources = check.scraped?.length || 0;
                  if (sources === 0) { alert('No scraped content found. Run "Clear all events & re-extract" first.'); return; }
                  alert(`Found ${sources} scraped sources. Running extraction — takes ~60 seconds.`);
                  await fetch(`${BASE}/admin/extract`, {method:'POST'});
                  let events = 0, start = Date.now();
                  while (events === 0 && Date.now() - start < 90000) {
                    await new Promise(r => setTimeout(r, 5000));
                    try { const ev = await (await fetch(`${BASE}/admin/events?zip=22046&limit=5`)).json(); events = ev.count || 0; } catch {}
                  }
                  alert(events > 0 ? `✓ Done! ${events} events. Reload to see them.` : 'Extraction ran but 0 events found. Check logs.');
                } catch (e) { alert('Extract failed: ' + e.message); }
              }}
            />
          </div>
        </Section>

        {/* ── Demo & Reset ── */}
        <Section title="Demo & Reset">
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
            <button onClick={() => { onSave({ onboardingDone: false }); onClose(); }} style={{
              fontSize:11, padding:'6px 14px', borderRadius:8, cursor:'pointer',
              background:'rgba(201,168,76,.12)', border:'0.5px solid rgba(201,168,76,.25)',
              color:'rgba(201,168,76,.8)', fontFamily:'DM Sans, sans-serif',
            }}>⚡ Re-run onboarding</button>
            <button onClick={() => { if (window.confirm('Reset all settings to defaults?')) { onSave({ onboardingDone: false, profiles: [], activeProfileId: null }); onClose(); }}} style={{
              fontSize:11, padding:'6px 14px', borderRadius:8, cursor:'pointer',
              background:'rgba(159,18,57,.12)', border:'0.5px solid rgba(253,164,175,.2)',
              color:'rgba(253,164,175,.6)', fontFamily:'DM Sans, sans-serif',
            }}>Reset everything</button>
          </div>
          <div style={{ ...row, borderBottom:'none' }}>
            <div>
              <div>Test mode</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:1 }}>Rotation every 10 seconds instead of minutes</div>
            </div>
            <Toggle checked={testMode} onChange={e => setTestMode(e.target.checked)} />
          </div>
        </Section>

        {/* ── Account ── */}
        {(user || onSignOut) && (
          <Section title="Account">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>{user?.email || 'Signed in'}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2 }}>Calendar connected automatically via Google sign-in</div>
              </div>
              {onSignOut && (
                <button onClick={() => { onClose(); onSignOut(); }} style={{
                  fontSize:11, padding:'5px 12px', borderRadius:8, cursor:'pointer',
                  background:'rgba(255,255,255,.06)', border:'0.5px solid rgba(255,255,255,.12)',
                  color:'rgba(255,255,255,.4)', fontFamily:'DM Sans, sans-serif',
                }}>Sign out</button>
              )}
            </div>
          </Section>
        )}

        <button onClick={save} style={{ width:'100%', padding:11, background:'rgba(26,99,50,.35)', color:'#6EE7A0', border:'0.5px solid rgba(110,231,160,.25)', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif', marginTop:4 }}>Save & close</button>
      </div>
    </div>
  );
}

function AdminButton({ label, desc, color, onClick, dangerous }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', flexDirection:'column', alignItems:'flex-start', gap:2,
      padding:'10px 14px', borderRadius:9, cursor:'pointer', textAlign:'left',
      background: dangerous ? 'rgba(245,158,11,.1)' : 'rgba(37,99,235,.1)',
      border: `0.5px solid ${color}44`,
      fontFamily:'DM Sans, sans-serif', width:'100%',
    }}>
      <span style={{fontSize:12, fontWeight:600, color}}>{label}</span>
      <span style={{fontSize:10, color:'rgba(255,255,255,.4)', lineHeight:1.4}}>{desc}</span>
    </button>
  );
}
