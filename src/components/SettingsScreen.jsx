import { useState } from 'react';
import { ALL_CATEGORIES, PREFERENCES, BUDGET_LEVELS, PROFILE_COLORS, DEFAULT_PROFILE } from '../data/content';
import ThemeToggle, { useTheme } from './ThemeToggle';
import NeighborhoodPicker from './NeighborhoodPicker';
import { useFriends } from '../hooks/useFriends';
import { STATIC_PAGE_LINKS } from './StaticPage';

// Admin is determined by email membership. Keep in sync with the list in
// SourcesScreen.jsx — both files gate the same audience.
const ADMIN_EMAILS = new Set([
  'adam@locale.app',
  'adamcrubin@gmail.com',
]);
function isAdminUser(user) {
  const email = (user?.email || '').toLowerCase();
  return ADMIN_EMAILS.has(email);
}

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
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>About me <span style={{ color:'rgba(255,255,255,.25)' }}>(Optional)</span></label>
            <textarea value={profile.aboutMe||''} onChange={e=>onUpdate({aboutMe:e.target.value})} rows={3} style={{
              width:'100%', padding:'6px 9px', borderRadius:8, border:'0.5px solid rgba(255,255,255,.12)',
              fontSize:12, background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)', fontFamily:'DM Sans, sans-serif', resize:'none', outline:'none', lineHeight:1.5,
            }} />
            <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginTop:4 }}>This information can be used to determine relevancy when finding events for you.</div>
          </div>

          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:6 }}>Budget <span style={{ color:'rgba(255,255,255,.25)' }}>(select all that apply)</span></label>
            <div style={{ display:'flex', gap:5 }}>
              {BUDGET_LEVELS.map(b => {
                const budgets = Array.isArray(profile.budget) ? profile.budget : (profile.budget ? [profile.budget] : []);
                const active = budgets.includes(b.value);
                const toggle = () => {
                  const next = active ? budgets.filter(x=>x!==b.value) : [...budgets, b.value];
                  onUpdate({ budget: next });
                };
                return (
                  <button key={b.value} onClick={toggle} style={{
                    flex:1, padding:'5px 2px', borderRadius:8, cursor:'pointer', textAlign:'center',
                    fontSize:11, fontFamily:'DM Sans, sans-serif', transition:'all .15s',
                    background: active ? 'rgba(201,168,76,.2)' : 'rgba(255,255,255,.05)',
                    color: active ? '#C9A84C' : 'rgba(255,255,255,.4)',
                    border: active ? '0.5px solid rgba(201,168,76,.35)' : '0.5px solid rgba(255,255,255,.1)',
                  }}>{b.symbol}</button>
                );
              })}
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
                state={(profile.categoryStates||{})[cat.id] || 'always'}
                onChange={state => setCatState(cat.id, state)}
              />
            ))}
          </div>

          <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
            <button onClick={() => {
              const budgets = Array.isArray(profile.budget) ? profile.budget : (profile.budget ? [profile.budget] : []);
              const prefs = (profile.prefs||[]).slice(0,8).join(', ') || 'none';
              const cats = Object.entries(profile.categoryStates||{}).filter(([,v])=>v==='always').map(([k])=>k).join(', ') || 'none';
              alert(`Preference Summary for ${profile.name}\n\nBudget: ${budgets.join(', ')||'not set'}\nPreferences: ${prefs}\nAlways-show categories: ${cats}\nAbout me: ${profile.aboutMe||'(none)'}`);
            }} style={{
              fontSize:11, padding:'5px 12px', borderRadius:8,
              background:'rgba(37,99,235,.15)', color:'#93C5FD', border:'0.5px solid rgba(37,99,235,.3)',
              cursor:'pointer', fontFamily:'DM Sans, sans-serif',
            }}>See preference summary</button>
            {canDelete && (
              <button onClick={onDelete} style={{
                fontSize:11, padding:'5px 12px', borderRadius:8,
                background:'rgba(190,18,60,.15)', color:'#FDA4AF', border:'0.5px solid rgba(190,18,60,.25)',
                cursor:'pointer', fontFamily:'DM Sans, sans-serif',
              }}>Delete profile</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsScreen({ settings, onSave, activeProfile, updateProfile, addProfile, removeProfile, onClose, user, onSignOut, onShowSources, onShowPage, calendar }) {
  const isAdmin = isAdminUser(user);
  const [city,          setCity]        = useState(settings.city);
  const [homeAddress,   setHomeAddress] = useState(settings.homeAddress || '');
  const [neighborhood,  setNeighborhood] = useState(settings.neighborhood || null);
  const [showNeighborhoodPicker, setShowNeighborhoodPicker] = useState(false);
  const [curatedMode,   setCuratedMode] = useState(settings.curatedMode || false);
  const [testMode,      setTestMode]    = useState(settings.testMode || false);
  const [adminExpanded, setAdminExpanded] = useState(false);
  const [friendsOpen,   setFriendsOpen] = useState(false);
  const { themeId, setTheme, currentTheme } = useTheme();

  // ── Delete account flow ───────────────────────────────────────────────────
  // Two-step confirmation. Calls DELETE /account which must tear down:
  //   - supabase auth user
  //   - profile_events / user_event_interactions rows
  //   - user_preferences / household_settings rows
  //   - friendships rows (once Friends ships)
  // Client falls back to sign-out if the backend endpoint doesn't exist yet,
  // so the UI is usable before the backend is wired.
  const deleteAccount = async () => {
    if (!window.confirm('Delete your Locale account? All saved events, profiles, preferences, and friends will be permanently removed. This cannot be undone.')) return;
    const typed = window.prompt('Type DELETE to confirm');
    if (typed !== 'DELETE') return;
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    try {
      const res = await fetch(`${BASE}/account/delete`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user?.email || null, userId: user?.id || null }),
      });
      if (!res.ok && res.status !== 404) {
        const msg = await res.text().catch(() => 'unknown error');
        throw new Error(`Server said ${res.status}: ${msg}`);
      }
      // Clear local app state so nothing survives to next sign-in.
      try { localStorage.clear(); } catch {}
      alert('Your account has been deleted. Signing you out.');
    } catch (e) {
      alert('Delete failed: ' + e.message + '\n\nYou will be signed out locally. Contact support if your account still appears.');
    }
    onClose();
    if (onSignOut) onSignOut();
  };

  // Derive a city label (e.g. "Washington, DC", "Arlington, VA") from the
  // selected neighborhood so the readonly "City or ZIP" field can go away.
  function cityFromNeighborhood(n) {
    if (!n) return 'Falls Church, VA';
    if (n.area === 'DC')         return 'Washington, DC';
    if (n.area === 'Arlington')  return 'Arlington, VA';
    if (n.area === 'Alexandria') return 'Alexandria, VA';
    if (n.area === 'Maryland')   return `${n.label}, MD`;
    return `${n.label}, VA`; // NoVA catch-all
  }

  const save = () => {
    const effectiveCity = neighborhood ? cityFromNeighborhood(neighborhood) : city;
    onSave({ city: effectiveCity, homeAddress, neighborhood, curatedMode, testMode });
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

        {/* ── Location — single unified neighborhood picker (city derived) ── */}
        <Section title="Location">
          <div style={{ marginBottom:8 }}>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>
              Neighborhood <span style={{ color:'#C9A84C' }}>*</span>
            </label>
            <button
              onClick={() => setShowNeighborhoodPicker(true)}
              style={{
                ...inpStyle,
                display:'flex', alignItems:'center', justifyContent:'space-between',
                cursor:'pointer', textAlign:'left', background:'rgba(255,255,255,.06)',
                color: neighborhood ? 'rgba(255,255,255,.85)' : 'rgba(255,255,255,.3)',
                minHeight: 40,
              }}
            >
              <span style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
                <span>📍</span>
                {neighborhood ? (
                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {neighborhood.label}
                    <span style={{ color:'rgba(255,255,255,.4)' }}> · {cityFromNeighborhood(neighborhood)} · {neighborhood.zip}</span>
                  </span>
                ) : (
                  <span>Choose your neighborhood…</span>
                )}
              </span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginLeft:8, flexShrink:0 }}>▾</span>
            </button>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:4 }}>
              <div style={{ fontSize:10, color:'rgba(255,255,255,.25)' }}>
                Tunes event rankings by distance.
              </div>
              {neighborhood && (
                <button
                  onClick={() => setNeighborhood(null)}
                  style={{ fontSize:10, color:'rgba(255,255,255,.3)', background:'none', border:'none', cursor:'pointer', fontFamily:'DM Sans, sans-serif', padding:'0 2px' }}
                >Clear</button>
              )}
            </div>
          </div>
          <div>
            <label style={{ fontSize:11, color:'rgba(255,255,255,.4)', display:'block', marginBottom:3 }}>Home address <span style={{ color:'rgba(255,255,255,.25)' }}>(optional)</span></label>
            <input value={homeAddress} onChange={e => setHomeAddress(e.target.value)} placeholder="123 Main St, Falls Church, VA 22046" style={inpStyle} />
            <div style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginTop:4 }}>Overrides neighborhood for exact distance calculations.</div>
          </div>
        </Section>

        {showNeighborhoodPicker && (
          <NeighborhoodPicker
            current={neighborhood?.label || null}
            onSelect={(n) => setNeighborhood(n)}
            onClose={() => setShowNeighborhoodPicker(false)}
          />
        )}

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

        {/* ── Friends ── */}
        {user && <FriendsSection user={user} />}

        {/* ── Data Sources ── */}
        {onShowSources && (
          <Section title="Data Sources">
            <button onClick={() => { onClose(); onShowSources(); }} style={{
              display:'flex', alignItems:'center', gap:8,
              width:'100%', padding:'9px 12px', borderRadius:9,
              background:'rgba(255,255,255,.05)', border:'0.5px solid rgba(255,255,255,.12)',
              color:'rgba(255,255,255,.7)', fontSize:12, cursor:'pointer',
              fontFamily:'DM Sans, sans-serif', textAlign:'left',
            }}>
              📡 <span>Manage sources</span>
            </button>
          </Section>
        )}

        {/* ── About Locale ── */}
        {onShowPage && (
          <Section title="About Locale">
            <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
              {STATIC_PAGE_LINKS.map(link => (
                <button key={link.id} onClick={() => { onClose(); onShowPage(link.id); }}
                  style={{
                    display:'flex', alignItems:'center', gap:10,
                    padding:'9px 10px', borderRadius:8,
                    background:'transparent', border:'none',
                    color:'rgba(255,255,255,.7)', fontSize:12,
                    fontFamily:'DM Sans, sans-serif', cursor:'pointer',
                    textAlign:'left', width:'100%',
                    transition:'background .15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span style={{ fontSize:13, width:16, textAlign:'center' }}>{link.icon}</span>
                  <span style={{ flex:1 }}>{link.label}</span>
                  <span style={{ color:'rgba(255,255,255,.3)', fontSize:11 }}>›</span>
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* ── Admin Tools (collapsible) — admin only ── */}
        {isAdmin && <div style={{ background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.08)', borderRadius:11, marginBottom:10, overflow:'hidden' }}>
          <div onClick={() => setAdminExpanded(e => !e)} style={{ padding:14, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,.5)' }}>Admin Tools</span>
              <span style={{ fontSize:10, color:'rgba(255,255,255,.25)', marginLeft:8 }}>Only for Adam</span>
            </div>
            <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>{adminExpanded ? '▲' : '▼'}</span>
          </div>

          {adminExpanded && (
            <div style={{ padding:'0 14px 14px', borderTop:'0.5px solid rgba(255,255,255,.07)' }}>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10, marginTop:10 }}>
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
              <div style={{ ...row, marginBottom:10 }}>
                <div>
                  <div>Test mode</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:1 }}>Rotation every 10 seconds instead of minutes</div>
                </div>
                <Toggle checked={testMode} onChange={e => setTestMode(e.target.checked)} />
              </div>
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
                        try { const c = await (await fetch(`${BASE}/admin/scraped?zip=dc-metro`)).json(); scraped = c.scraped?.length || 0; } catch {}
                      }
                      if (scraped === 0) { alert('Scraping timed out — check Render logs.'); return; }
                      alert(`✓ Scraped ${scraped} sources.\n\nStep 3/3: Running extraction...`);
                      await fetch(`${BASE}/admin/extract`, {method:'POST'});
                      let events = 0, extStart = Date.now();
                      while (events === 0 && Date.now() - extStart < 120000) {
                        await new Promise(r => setTimeout(r, 5000));
                        try { const e = await (await fetch(`${BASE}/admin/events?zip=dc-metro&limit=5`)).json(); events = e.count || 0; } catch {}
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
                      const check = await (await fetch(`${BASE}/admin/scraped?zip=dc-metro`)).json();
                      const sources = check.scraped?.length || 0;
                      if (sources === 0) { alert('No scraped content found. Run "Clear all events & re-extract" first.'); return; }
                      alert(`Found ${sources} scraped sources. Running extraction — takes ~60 seconds.`);
                      await fetch(`${BASE}/admin/extract`, {method:'POST'});
                      let events = 0, start = Date.now();
                      while (events === 0 && Date.now() - start < 90000) {
                        await new Promise(r => setTimeout(r, 5000));
                        try { const ev = await (await fetch(`${BASE}/admin/events?zip=dc-metro&limit=5`)).json(); events = ev.count || 0; } catch {}
                      }
                      alert(events > 0 ? `✓ Done! ${events} events. Reload to see them.` : 'Extraction ran but 0 events found. Check logs.');
                    } catch (e) { alert('Extract failed: ' + e.message); }
                  }}
                />
              </div>
            </div>
          )}
        </div>}

        {/* ── Account ── */}
        {(user || onSignOut) && (
          <Section title="Account">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:10 }}>
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
            <div style={{ borderTop:'0.5px solid rgba(255,255,255,.07)', paddingTop:10, display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
              <div>
                <div style={{ fontSize:12, color:'rgba(253,164,175,.8)' }}>Delete account</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', marginTop:2 }}>Permanently removes your profile, saved events, preferences, and friends.</div>
              </div>
              <button onClick={deleteAccount} style={{
                fontSize:11, padding:'5px 12px', borderRadius:8, cursor:'pointer',
                background:'rgba(159,18,57,.15)', border:'0.5px solid rgba(253,164,175,.25)',
                color:'#FDA4AF', fontFamily:'DM Sans, sans-serif', flexShrink:0,
              }}>Delete</button>
            </div>
          </Section>
        )}

        <button onClick={save} style={{ width:'100%', padding:11, background:'rgba(26,99,50,.35)', color:'#6EE7A0', border:'0.5px solid rgba(110,231,160,.25)', borderRadius:9, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'DM Sans, sans-serif', marginTop:4 }}>Save & close</button>
      </div>
    </div>
  );
}

// ── Friends section ───────────────────────────────────────────────────────────
// Lists current friends, shows incoming pending requests with accept/decline
// inline, and a small email-invite form. Hidden when the backend is still in
// auto-all demo mode (FRIENDS_AUTO_ALL=true) — the list would be "every user
// on Locale" which isn't actionable; we show a small notice instead.
function FriendsSection({ user }) {
  const { friends, pending, autoAll, loading, invite, accept, decline, remove } = useFriends(user);
  const [emailInput, setEmailInput]   = useState('');
  const [inviteMsg,  setInviteMsg]    = useState(null);  // { ok, text }
  const [busy,       setBusy]         = useState(false);

  const doInvite = async () => {
    const email = emailInput.trim();
    if (!email) return;
    setBusy(true);
    setInviteMsg(null);
    try {
      const res = await invite(email);
      setEmailInput('');
      setInviteMsg({ ok: true, text: res.state === 'queued_for_signup'
        ? `✓ We'll alert ${email} once they join Locale.`
        : `✓ Invite sent to ${email}.` });
    } catch (e) {
      setInviteMsg({ ok: false, text: e.message || 'Invite failed.' });
    }
    setBusy(false);
  };

  const btn = {
    fontSize:11, padding:'4px 10px', borderRadius:7, cursor:'pointer',
    fontFamily:'DM Sans, sans-serif',
  };
  const inputStyle = { width:'100%', padding:'7px 10px', borderRadius:8,
    border:'0.5px solid rgba(255,255,255,.12)', fontSize:12,
    background:'rgba(255,255,255,.06)', color:'rgba(255,255,255,.85)',
    fontFamily:'DM Sans, sans-serif', outline:'none', boxSizing:'border-box' };

  return (
    <Section title={`Friends${pending.length > 0 ? ` · ${pending.length} pending` : ''}`}
             desc="When your friends save, like, or add an event to their calendar, you'll see their avatar on it — and it'll score higher in your feed.">
      {autoAll && (
        <div style={{ fontSize:10, color:'rgba(201,168,76,.75)', padding:'6px 8px',
                      background:'rgba(201,168,76,.08)', border:'0.5px dashed rgba(201,168,76,.3)',
                      borderRadius:6, marginBottom:10 }}>
          Demo mode — every Locale user counts as a friend right now. Real invite flow is live;
          flip <code style={{ background:'rgba(0,0,0,.3)', padding:'0 4px', borderRadius:3 }}>FRIENDS_AUTO_ALL</code> off
          server-side once you want to switch.
        </div>
      )}

      {/* Pending incoming */}
      {pending.length > 0 && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
            Incoming requests
          </div>
          {pending.map(p => (
            <div key={p.friendship_id} style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'7px 9px', borderRadius:8, marginBottom:5,
              background:'rgba(201,168,76,.08)',
              border:'0.5px solid rgba(201,168,76,.25)',
            }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.85)', fontWeight:500 }}>{p.name}</div>
                <div style={{ fontSize:10, color:'rgba(255,255,255,.35)' }}>{p.email}</div>
              </div>
              <button onClick={() => accept(p.friendship_id)} style={{ ...btn,
                background:'rgba(34,197,94,.2)', border:'0.5px solid rgba(34,197,94,.35)', color:'#22c55e' }}>Accept</button>
              <button onClick={() => decline(p.friendship_id)} style={{ ...btn,
                background:'rgba(255,255,255,.05)', border:'0.5px solid rgba(255,255,255,.12)', color:'rgba(255,255,255,.4)' }}>Decline</button>
            </div>
          ))}
        </div>
      )}

      {/* Invite form */}
      {!autoAll && (
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
            Invite by email
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <input type="email" value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !busy && doInvite()}
              placeholder="friend@example.com" style={inputStyle} />
            <button onClick={doInvite} disabled={busy || !emailInput.trim()} style={{ ...btn,
              flexShrink:0, padding:'7px 14px',
              background:'rgba(201,168,76,.2)', border:'0.5px solid rgba(201,168,76,.35)',
              color:'#C9A84C', fontWeight:600, opacity: busy || !emailInput.trim() ? 0.5 : 1 }}>
              {busy ? '⏳' : 'Invite'}
            </button>
          </div>
          {inviteMsg && (
            <div style={{ fontSize:11, marginTop:6,
              color: inviteMsg.ok ? '#6EE7A0' : '#FDA4AF' }}>{inviteMsg.text}</div>
          )}
        </div>
      )}

      {/* Current friends */}
      <div>
        <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 }}>
          {autoAll ? `Locale users (${friends.length})` : `Your friends (${friends.length})`}
        </div>
        {loading && friends.length === 0 ? (
          <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontStyle:'italic' }}>Loading…</div>
        ) : friends.length === 0 ? (
          <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', fontStyle:'italic' }}>
            No friends yet. Invite someone above.
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            {friends.map(f => (
              <div key={f.id} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'6px 9px', borderRadius:7,
                background:'rgba(255,255,255,.03)',
              }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.8)' }}>{f.name}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>{f.email}</div>
                </div>
                {!autoAll && f.friendship_id && (
                  <button onClick={() => {
                    if (window.confirm(`Remove ${f.name} from your friends?`)) remove(f.friendship_id);
                  }} style={{ ...btn,
                    background:'rgba(255,255,255,.04)', border:'0.5px solid rgba(255,255,255,.1)',
                    color:'rgba(253,164,175,.55)' }}>Remove</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
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
