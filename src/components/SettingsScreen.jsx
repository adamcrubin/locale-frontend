import { useState } from 'react';
import { ALL_CATEGORIES, PREFERENCES, BUDGET_LEVELS, PROFILE_COLORS, DEFAULT_PROFILE } from '../data/content';

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

// 3-state category selector: always / sometimes / never
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

// Single profile editor panel
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
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ padding:'11px 13px', display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
      >
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
          {/* Name */}
          <div style={{ marginBottom:10, marginTop:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>Name</label>
            <input value={profile.name} onChange={e => onUpdate({ name: e.target.value })} style={{
              width:'100%', padding:'6px 9px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)',
              fontSize:12, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)', fontFamily:'DM Sans, sans-serif', outline:'none',
            }} />
          </div>

          {/* Color */}
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:6 }}>Color</label>
            <div style={{ display:'flex', gap:8 }}>
              {profileColors.map(c => (
                <button key={c.id} onClick={() => onUpdate({ colorId: c.id })} style={{
                  width:28, height:28, borderRadius:'50%', background:c.hex, border: profile.colorId===c.id ? `2px solid white` : '2px solid transparent',
                  cursor:'pointer', transition:'border .15s',
                }} />
              ))}
            </div>
          </div>

          {/* About me */}
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>About me (AI uses this)</label>
            <textarea value={profile.aboutMe||''} onChange={e=>onUpdate({aboutMe:e.target.value})} rows={3} style={{
              width:'100%', padding:'6px 9px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)',
              fontSize:12, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)', fontFamily:'DM Sans, sans-serif', resize:'none', outline:'none', lineHeight:1.5,
            }} />
          </div>

          {/* Budget */}
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

          {/* Preferences */}
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

          {/* Category states */}
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

export default function SettingsScreen({ settings, onSave, activeProfile, updateProfile, addProfile, removeProfile, onClose, user, onSignOut, onShowSources }) {
  const [city,         setCity]        = useState(settings.city);
  const [homeAddress,  setHomeAddress] = useState(settings.homeAddress || '');
  const [interval,     setIntervalV]   = useState(settings.intervalMinutes);
  const [testMode,     setTestMode]    = useState(settings.testMode || false);
  const [gcal,         setGcal]        = useState(settings.gcalConnected);
  const [ambientMins,  setAmbient]     = useState(settings.ambientTimeoutMinutes || 10);
  const [spotlightMode,setSpotlight]   = useState(settings.spotlightMode || 'strip');
  const [columnOrder,  setColumnOrder] = useState(settings.columnOrder || 'relevancy');
  const [curatedMode,  setCuratedMode] = useState(settings.curatedMode || false);

  const save = () => {
    onSave({ city, homeAddress, intervalMinutes:interval, testMode, gcalConnected:gcal, ambientTimeoutMinutes:ambientMins, spotlightMode, columnOrder, curatedMode });
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

  return (
    <div className="fade-enter" style={{ position:'fixed', inset:0, background:'#141210', zIndex:60, overflowY:'auto', display:'flex', flexDirection:'column' }}>
      <div style={{ background:'#1C1A17', borderBottom:'0.5px solid rgba(255,255,255,.07)', padding:'12px 18px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span className="serif" style={{ fontSize:20, color:'rgba(255,255,255,.9)', fontWeight:300 }}>Settings</span>
        <button onClick={save} style={{ background:'rgba(26,99,50,.35)', color:'#6EE7A0', border:'0.5px solid rgba(110,231,160,.25)', borderRadius:8, padding:'6px 16px', fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif' }}>Save & close</button>
      </div>

      <div style={{ padding:16, flex:1 }}>

        <Section title="Location">
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="City, state or ZIP code" style={inpStyle} />
          <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginTop:5 }}>Accepts city name or ZIP code — e.g. "Falls Church, VA" or "22046"</div>
        </Section>

        <Section title="Home Address" desc="Used for directions and distance-based recommendations">
          <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="e.g. 123 Main St, Falls Church, VA 22046" style={inpStyle} />
          <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginTop:5 }}>Starting point for Google Maps directions. Street address recommended.</div>
        </Section>

        <Section title="Google Calendar" desc="Connect to add activities directly to your calendar with one tap">
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, padding:'3px 9px', borderRadius:99, background: gcal ? 'rgba(26,99,50,.3)' : 'rgba(159,18,57,.2)', color: gcal ? '#6EE7A0' : '#FDA4AF', border: gcal ? '0.5px solid rgba(110,231,160,.25)' : '0.5px solid rgba(253,164,175,.25)' }}>
              {gcal ? '✓ Connected' : 'Not connected'}
            </span>
            {!gcal && (
              <button onClick={() => {
                const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                window.open(`${backendUrl}/auth/google?userId=${user?.id||'anonymous'}&profileId=${activeProfile?.id||'default'}`, '_blank', 'width=600,height=700');
              }} style={{ fontSize:11, padding:'4px 11px', borderRadius:8, cursor:'pointer', background:'rgba(66,133,244,.2)', border:'0.5px solid rgba(66,133,244,.3)', color:'#93BBFD', fontFamily:'DM Sans, sans-serif' }}>
                Connect Google Calendar
              </button>
            )}
            {gcal && (
              <button onClick={() => setGcal(false)} style={{ fontSize:11, padding:'4px 11px', borderRadius:8, cursor:'pointer', background:'rgba(255,255,255,.07)', border:'0.5px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.4)', fontFamily:'DM Sans, sans-serif' }}>
                Disconnect
              </button>
            )}
          </div>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginTop:5 }}>Events you add will appear in your Google Calendar. Shared across Adam and Kailee.</div>
        </Section>

        <Section title="Spotlight" desc="How to surface the top event of the weekend">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              ['none',    'None',           'No spotlight — just the regular feed'],
              ['strip',   '⭐ Strip',        'Horizontal strip of top events below the prompts bar'],
              ['hero',    '🦸 Hero card',    'Full-width hero card at top of first column'],
              ['overlay', '✨ Entry overlay','Full-screen spotlight on first load, auto-dismisses'],
              ['sidebar', '📌 Sidebar',      'Persistent spotlight card in the right sidebar'],
            ].map(([mode, label, desc]) => (
              <div key={mode} onClick={() => setSpotlight(mode)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                borderRadius:9, border:`0.5px solid ${spotlightMode===mode?'rgba(201,168,76,.4)':'rgba(255,255,255,.1)'}`,
                background: spotlightMode===mode ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.04)',
                cursor:'pointer', transition:'all .15s',
              }}>
                <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${spotlightMode===mode?'#C9A84C':'rgba(255,255,255,.2)'}`, background:spotlightMode===mode?'#C9A84C':'transparent', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:spotlightMode===mode?'#C9A84C':'rgba(255,255,255,.8)' }}>{label}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Column Order" desc="How categories are arranged left to right">
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {[
              ['relevancy', '📊 By relevancy', 'Best-stocked categories appear first. Changes weekly.'],
              ['fixed',     '📌 Fixed order',  'Categories always in the same order.'],
              ['random',    '🎲 Randomized',   'Shuffled on each load. Surprises you.'],
            ].map(([mode, label, desc]) => (
              <div key={mode} onClick={() => setColumnOrder(mode)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                borderRadius:9, border:`0.5px solid ${columnOrder===mode?'rgba(201,168,76,.4)':'rgba(255,255,255,.1)'}`,
                background: columnOrder===mode ? 'rgba(201,168,76,.1)' : 'rgba(255,255,255,.04)',
                cursor:'pointer', transition:'all .15s',
              }}>
                <div style={{ width:16, height:16, borderRadius:'50%', border:`2px solid ${columnOrder===mode?'#C9A84C':'rgba(255,255,255,.2)'}`, background:columnOrder===mode?'#C9A84C':'transparent', flexShrink:0 }} />
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:columnOrder===mode?'#C9A84C':'rgba(255,255,255,.8)' }}>{label}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:1 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Profiles */}
        <Section title="Profiles" desc="Up to 5 profiles — each has their own preferences, categories, and saved items. Calendar is shared.">
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

        <Section title="Timing & behavior">
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,.07)', fontSize:12, color:'rgba(255,255,255,.65)' }}>
            <span>Rotation interval</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="range" min="1" max="10" step="1" value={interval} onChange={e=>setIntervalV(Number(e.target.value))} style={{ width:80 }} />
              <span style={{ fontWeight:600, color:'rgba(255,255,255,.8)', minWidth:40 }}>{interval} min</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,.07)', fontSize:12, color:'rgba(255,255,255,.65)' }}>
            <span>Return to ambient after</span>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="range" min="2" max="30" step="1" value={ambientMins} onChange={e=>setAmbient(Number(e.target.value))} style={{ width:80 }} />
              <span style={{ fontWeight:600, color:'rgba(255,255,255,.8)', minWidth:50 }}>{ambientMins} min</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', borderBottom:'0.5px solid rgba(255,255,255,.07)', fontSize:12, color:'rgba(255,255,255,.65)' }}>
            <div>
              <div>Curated mode</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:1 }}>Limit to max 5 activities per category — less choice, less paralysis</div>
            </div>
            <Toggle checked={curatedMode} onChange={e=>setCuratedMode(e.target.checked)} />
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'7px 0', fontSize:12, color:'rgba(255,255,255,.65)' }}>
            <div>
              <div>Test mode</div>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:1 }}>Rotation every 10 seconds instead of minutes</div>
            </div>
            <Toggle checked={testMode} onChange={e=>setTestMode(e.target.checked)} />
          </div>
        </Section>

        <Section title="Demo & Reset" desc="For demos and testing">
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
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
        </Section>

        <Section title="Event Pipeline (Admin)" desc="Rebuild event data from scratch">
          <div style={{display:'flex',flexDirection:'column',gap:6}}>
            <AdminButton
              label="🗑  Clear all events & re-extract"
              desc="Wipes DB, re-scrapes all sources, re-runs Haiku extraction. Takes 2-4 minutes."
              color="#F59E0B"
              dangerous
              onClick={async () => {
                if (!window.confirm('Delete ALL events and scraped content, then re-run the full pipeline?\n\nThis takes 2-4 minutes. Good for clearing stale/inappropriate events after extraction rules change.')) return;
                const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                try {
                  alert('Step 1/3: Clearing database...');
                  const clr = await (await fetch(`${BASE}/admin/clear-events`, {method:'POST'})).json();
                  alert(`Cleared ${clr.eventsDeleted} events.\n\nStep 2/3: Scraping sources — this takes 2-3 minutes.\nClick OK and wait for the next alert.`);

                  // Kick off scraping (async on backend)
                  await fetch(`${BASE}/admin/refresh/sources`, {method:'POST'});

                  // Poll scraped_content count until rows appear or 4 min timeout
                  let scraped = 0;
                  const start = Date.now();
                  while (scraped === 0 && Date.now() - start < 240000) {
                    await new Promise(r => setTimeout(r, 8000)); // wait 8s between checks
                    try {
                      const check = await (await fetch(`${BASE}/admin/scraped?zip=22046`)).json();
                      scraped = check.scraped?.length || 0;
                    } catch {}
                  }

                  if (scraped === 0) {
                    alert('Scraping timed out — no content found after 4 minutes.\nCheck Render logs for errors.');
                    return;
                  }

                  alert(`✓ Scraped ${scraped} sources.\n\nStep 3/3: Running Haiku extraction...`);
                  await fetch(`${BASE}/admin/extract`, {method:'POST'});

                  // Wait for extraction (also async) — poll events count
                  let events = 0;
                  const extStart = Date.now();
                  while (events === 0 && Date.now() - extStart < 120000) {
                    await new Promise(r => setTimeout(r, 5000));
                    try {
                      const check = await (await fetch(`${BASE}/admin/events?zip=22046&limit=5`)).json();
                      events = check.count || 0;
                    } catch {}
                  }

                  alert(`✓ Done! ${events} events in database.\nReload the page to see new events.`);
                } catch (e) {
                  alert('Pipeline failed: ' + e.message);
                }
              }}
            />
            <AdminButton
              label="🔄  Just re-extract (keep scraped HTML)"
              desc="Re-runs Haiku on existing scraped_content. Use this if scraping already ran recently."
              color="#2563EB"
              onClick={async () => {
                const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                try {
                  // First check if there's anything to extract
                  const check = await (await fetch(`${BASE}/admin/scraped?zip=22046`)).json();
                  const sources = check.scraped?.length || 0;
                  if (sources === 0) {
                    alert('No scraped content found in database.\nRun "Clear all events & re-extract" first to scrape sources.');
                    return;
                  }

                  alert(`Found ${sources} scraped sources. Running Haiku extraction — takes ~60 seconds.\nClick OK and wait.`);
                  await fetch(`${BASE}/admin/extract`, {method:'POST'});

                  // Poll for events
                  let events = 0;
                  const start = Date.now();
                  while (events === 0 && Date.now() - start < 90000) {
                    await new Promise(r => setTimeout(r, 5000));
                    try {
                      const ev = await (await fetch(`${BASE}/admin/events?zip=22046&limit=5`)).json();
                      events = ev.count || 0;
                    } catch {}
                  }

                  alert(events > 0
                    ? `✓ Done! ${events} events in database. Reload to see them.`
                    : 'Extraction ran but 0 events found. Check Render logs — may be a prompt or DB issue.');
                } catch (e) {
                  alert('Extract failed: ' + e.message);
                }
              }}
            />
          </div>
        </Section>

        {/* Account section */}
        {(user || onSignOut) && (
          <Section title="Account">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>{user?.email || 'Signed in'}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2 }}>Synced across devices via Google</div>
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

        {/* Sources page link */}
        {onShowSources && (
          <button onClick={() => { onClose(); onShowSources(); }} style={{
            width:'100%', padding:11, background:'rgba(255,255,255,.04)',
            color:'rgba(255,255,255,.5)', border:'0.5px solid rgba(255,255,255,.1)',
            borderRadius:9, fontSize:13, cursor:'pointer', fontFamily:'DM Sans, sans-serif',
            marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            📡 Manage sources →
          </button>
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
      fontFamily:'DM Sans, sans-serif',
    }}>
      <span style={{fontSize:12, fontWeight:600, color}}>{label}</span>
      <span style={{fontSize:10, color:'rgba(255,255,255,.4)', lineHeight:1.4}}>{desc}</span>
    </button>
  );
}
