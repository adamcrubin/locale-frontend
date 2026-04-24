import { useState, useRef, useEffect, Component } from 'react';
import { ALL_CATEGORIES, PROFILE_COLORS } from '../data/content';
import AIPromptModal from './AIPromptModal';
import ThemeToggle, { useTheme } from './ThemeToggle';
import { usePipelineStatus } from '../hooks/usePipelineStatus';
import {
  isFrontendBlocked, getWeatherBoost, getWeekendWeather,
  sortCategoriesByRelevancy,
} from './ActiveMode/utils';
import { useIsMobile } from './ActiveMode/useIsMobile';
import ReserveModal from './ActiveMode/ReserveModal';
import AskClaude from './ActiveMode/AskClaude';
import { CatColumn, StackedColumn } from './ActiveMode/CatColumn';
import { SpotlightOverlay } from './ActiveMode/Spotlight';
import WeekendSidebar from './ActiveMode/WeekendSidebar';
import MobileLayout from './ActiveMode/MobileLayout';

class ColumnErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  componentDidCatch(e, info) { console.error('[ColumnErrorBoundary]', e, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12, color:'var(--muted)', fontFamily:'var(--font-body)', padding:32 }}>
          <div style={{ fontSize:32 }}>⚠️</div>
          <div style={{ fontSize:14 }}>Something went wrong rendering the feed.</div>
          <button onClick={() => this.setState({ error: null })} style={{ fontSize:12, padding:'6px 16px', borderRadius:8, cursor:'pointer', background:'var(--accent-bg)', border:'0.5px solid var(--accent-border)', color:'var(--accent)', fontFamily:'var(--font-body)' }}>Try again</button>
          <details style={{ fontSize:10, color:'var(--muted)', maxWidth:400 }}><summary>Details</summary>{this.state.error?.message}</details>
        </div>
      );
    }
    return this.props.children;
  }
}

const QUICK_PROMPTS = [
  { label:'A Fun-Filled Saturday', canned: true },
  { label:'Something New', canned: true },
  { label:'Weekend Away Itinerary', canned: true },
  { label:'✏️ Ask Anything', canned: true },
];

export default function ActiveMode({ settings, activeProfile, calQueue, activities={}, weather=[], activitiesSource='mock', weatherSource='mock', calendar, onCalendar, onWeather, onSettings, onAmbient, onSwitchProfile, onSaveItem, onShowSaved, onThumbUp, onThumbDown, onEditCal, timeFilters=[], setTimeFilters, priceFilters=[], setPriceFilters, onOpenFilter, isDemo=false, onLoginPrompt }) {
  const gateDemo = (feature, fn) => (...args) => {
    if (isDemo) { onLoginPrompt?.(feature); return; }
    return fn?.(...args);
  };
  const [removed,      setRemoved]      = useState({});
  const [activeCat,    setActiveCat]    = useState('all');
  const [aiPrompt,     setAiPrompt]     = useState(null);
  const [reserveAct,   setReserveAct]   = useState(null);
  const [colPage,      setColPage]      = useState(0);
  const [showAsk,      setShowAsk]      = useState(false);
  const [overlayShown, setOverlayShown] = useState(false);

  const { themeId, setTheme, currentTheme } = useTheme();
  const { active: pipelineActive, label: pipelineLabel } = usePipelineStatus();

  const profileColor  = PROFILE_COLORS.find(c=>c.id===activeProfile?.colorId)||PROFILE_COLORS[0];
  const { boost, dim } = getWeatherBoost(weather);
  const homeAddress    = settings?.homeAddress||activeProfile?.homeAddress||'';

  const spotlightMode= settings?.spotlightMode|| 'strip';
  const columnOrder  = settings?.columnOrder  || 'relevancy';
  const curatedMode  = settings?.curatedMode  || false;

  const isMobile = useIsMobile();

  const removeAct  = (catId,act) => setRemoved(r=>({...r,[`${catId}::${act.title}`]:true}));
  const heartAct   = (catId,act) => onSaveItem?.({...act,catId});
  const thumbUp    = (catId,act) => onThumbUp?.(catId,act);
  const thumbDown  = (catId,act) => { setRemoved(r=>({...r,[`${catId}::${act.title}`]:true})); onThumbDown?.(catId,act); };

  const catStates    = activeProfile?.categoryStates||{};
  // Missing categoryStates entry => treat as 'always'. This matches the
  // per-category preference editor (which renders missing entries as
  // 'always' selected) AND means new categories added to ALL_CATEGORIES
  // show up automatically for existing users instead of silently vanishing
  // because their profile predates the new bucket.
  const alwaysCats   = ALL_CATEGORIES.filter(c=>catStates[c.id]===undefined || catStates[c.id]==='always');
  const sometimesCats= ALL_CATEGORIES.filter(c=>catStates[c.id]==='sometimes');
  const defaultCats  = ALL_CATEGORIES.slice(0,9);
  const curatedCat   = ALL_CATEGORIES.find(c=>c.id==='curated');
  let baseCats = activeCat==='all'
    ? (alwaysCats.length>0?[...alwaysCats,...sometimesCats.slice(0,4)]:defaultCats)
    : ALL_CATEGORIES.filter(c=>c.id===activeCat);

  let visibleCats = columnOrder==='relevancy'
    ? sortCategoriesByRelevancy(baseCats, activities)
    : columnOrder==='random'
    ? [...baseCats].sort(()=>Math.random()-0.5)
    : baseCats;

  if (activeCat === 'all' && curatedCat) {
    visibleCats = [curatedCat, ...visibleCats.filter(c => c.id !== 'curated')];
  }

  // ── Merge thin columns into a synthetic "Other" bucket ─────────────────
  // Any category with < THIN_THRESHOLD events this weekend gets pulled out
  // of visibleCats and its items are rolled into `activities.other`. Items
  // keep their original category (via categories[]) so the Other column
  // can render each title prefixed with the source emoji via sourceCatIcon.
  const THIN_THRESHOLD = 3;
  let effectiveActivities = activities;
  if (activeCat === 'all') {
    const otherCat = ALL_CATEGORIES.find(c => c.id === 'other');
    const thinIds = [];
    const otherBucket = [];
    for (const cat of visibleCats) {
      if (cat.id === 'curated' || cat.id === 'other' || cat.id === 'trips' || cat.id === 'away') continue;
      const items = activities[cat.id] || [];
      if (items.length > 0 && items.length < THIN_THRESHOLD) {
        thinIds.push(cat.id);
        for (const it of items) {
          // Preserve original category for sourceCatIcon() on render.
          const cats = Array.isArray(it.categories) ? it.categories : [];
          otherBucket.push({ ...it, categories: cats.includes(cat.id) ? cats : [cat.id, ...cats] });
        }
      }
    }
    if (thinIds.length > 0 && otherCat) {
      effectiveActivities = { ...activities, other: otherBucket };
      visibleCats = visibleCats.filter(c => !thinIds.includes(c.id));
      // Drop in 'other' before the trailing trips/away columns
      const tail = visibleCats.filter(c => c.id === 'trips' || c.id === 'away');
      const body = visibleCats.filter(c => c.id !== 'trips' && c.id !== 'away');
      visibleCats = [...body, otherCat, ...tail];
    }
  }

  const COLS_PER_PAGE = isMobile ? 1 : 4;
  const numPages = Math.max(1, Math.ceil(visibleCats.length/COLS_PER_PAGE));
  const safePage = Math.min(colPage, numPages - 1);
  const pageCats = visibleCats.slice(safePage*COLS_PER_PAGE, safePage*COLS_PER_PAGE+COLS_PER_PAGE);
  useEffect(() => { if (colPage !== safePage) setColPage(safePage); }, [numPages]);

  const swipeX   = useRef(null);
  const swipeDir = useRef(null);
  const onTS = e=>{swipeX.current=e.touches[0].clientX;swipeDir.current=null;};
  const onTM = e=>{if(swipeDir.current)return;const dx=Math.abs(e.touches[0].clientX-swipeX.current);const dy=Math.abs(e.touches[0].clientY-swipeX.current);if(dx>6||dy>6)swipeDir.current=dx>dy?'h':'v';};
  const onTE = e=>{if(swipeDir.current!=='h')return;const dx=e.changedTouches[0].clientX-swipeX.current;if(dx<-40&&safePage<numPages-1)setColPage(p=>Math.min(p+1,numPages-1));else if(dx>40&&safePage>0)setColPage(p=>Math.max(p-1,0));};

  const crossCatSeen = new Set();

  const colProps = { removed, onCal:onCalendar, onRemove:removeAct, onHeart:heartAct, onThumbUp:thumbUp, onThumbDown:thumbDown, onReserve:gateDemo('reserve',(act,cid)=>setReserveAct({act,catId:cid})), weatherDim:dim, weatherBoost:boost, homeAddress, profileId:activeProfile?.id||'default', spotlightMode, activities: effectiveActivities, isMobile, timeFilters, setTimeFilters, priceFilters, setPriceFilters, onOpenFilter, hasConflict: calendar?.hasConflict, crossCatSeen, curatedMode, weather, onWeather };

  return (
    <div className="fade-enter" style={{display:'grid',gridTemplateRows:'auto auto 1fr auto',height:'100%',background:'var(--bg)',overflow:'hidden',fontFamily:'var(--font-body)'}}>

      {/* Header */}
      <div style={{background:'var(--header-bg)',padding:'9px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div>
            <span style={{fontSize:20,color:'rgba(255,255,255,.9)',fontWeight:300,letterSpacing:'.06em',fontFamily:'var(--font-display)'}}>Locale</span>
            {!isMobile && <div style={{fontSize:10,color:'rgba(255,255,255,.25)',fontFamily:'var(--font-body)',letterSpacing:'.02em',marginTop:-2}}>your personal weekend planner</div>}
          </div>
          <button onClick={()=>onSettings()} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:8,cursor:'pointer',background:'rgba(255,255,255,.06)',border:'0.5px solid rgba(255,255,255,.1)',color:'rgba(255,255,255,.45)',fontSize:11,fontFamily:'var(--font-body)'}}>
            <span>{settings.city}</span>
            <span style={{fontSize:9,opacity:.7}}>▾</span>
          </button>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {!isMobile && (
            <button onClick={gateDemo('ai',()=>setShowAsk(true))} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'var(--accent-bg)',border:'0.5px solid var(--accent-border)',color:'var(--accent)',fontFamily:'var(--font-body)'}}>Ask</button>
          )}
          {!isMobile && (
            <div title={`Activities: ${activitiesSource}`} style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:activitiesSource==='live'?'#22c55e':'#f59e0b',boxShadow:activitiesSource==='live'?'0 0 6px #22c55e88':'0 0 6px #f59e0b66'}}/>
          )}
          {!isMobile && (
            <button onClick={onShowSaved} style={{fontSize:13,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',color:'#E53E3E',fontFamily:'var(--font-body)'}}>♥</button>
          )}
          {!isMobile && !isDemo && (
            <button onClick={onSwitchProfile} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 7px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:profileColor.border,border:`0.5px solid ${profileColor.border}`,fontFamily:'var(--font-body)'}}>
              <div style={{width:16,height:16,borderRadius:'50%',background:profileColor.hex,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white',fontWeight:600}}>{activeProfile?.name?.charAt(0)||'A'}</div>
              <span style={{fontSize:11,color:profileColor.light,fontWeight:500}}>{activeProfile?.name}</span>
              <span style={{fontSize:9,color:`${profileColor.light}88`}}>▾</span>
            </button>
          )}
          {isDemo && (
            <button onClick={()=>onLoginPrompt?.('default')} style={{fontSize:11,padding:'5px 12px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'#C9A84C',border:'none',color:'#1C1A17',fontWeight:600,fontFamily:'var(--font-body)'}}>Sign in</button>
          )}
          {!isMobile && pipelineActive && (
            <div style={{display:'flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:99,background:'rgba(201,168,76,.12)',border:'0.5px solid rgba(201,168,76,.25)'}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#C9A84C',display:'inline-block',animation:'pulse 1.2s ease-in-out infinite'}}/>
              <span style={{fontSize:10,color:'#C9A84C',fontWeight:500,whiteSpace:'nowrap'}}>{pipelineLabel}</span>
            </div>
          )}
          <button onClick={() => onSettings()} style={{fontSize:isMobile?14:11,padding:isMobile?'4px 7px':'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'rgba(255,255,255,.07)',border:'0.5px solid rgba(255,255,255,.12)',color:'rgba(255,255,255,.55)',fontFamily:'var(--font-body)'}}>⚙</button>
          {!isMobile && (
            <button onClick={onAmbient} style={{fontSize:11,padding:'5px 10px',borderRadius:'var(--radius-btn)',cursor:'pointer',background:'var(--accent-bg)',border:'0.5px solid var(--accent-border)',color:'var(--accent)',fontFamily:'var(--font-body)'}}>Ambient</button>
          )}
        </div>
      </div>

      {/* Quick prompts — desktop only */}
      {!isMobile && <div style={{background:'var(--header-bg2)',padding:'7px 18px',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:11,color:'rgba(255,255,255,.28)',whiteSpace:'nowrap',flexShrink:0,fontFamily:'DM Sans,sans-serif'}}>Pick a plan for me...</span>
        <div style={{display:'flex',gap:5,overflowX:'auto',flex:1}} className="no-scroll">
          {QUICK_PROMPTS.map(p=>(
            <button key={p.label} onClick={gateDemo('ai',()=>setAiPrompt(p))} style={{
              fontSize:11,padding:'5px 12px',borderRadius:99,whiteSpace:'nowrap',
              background:'rgba(255,255,255,.09)',border:'0.5px solid rgba(255,255,255,.14)',
              color:'rgba(255,255,255,.7)',cursor:'pointer',fontFamily:'DM Sans,sans-serif',fontWeight:500,transition:'all .15s',
            }}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(201,168,76,.2)';e.currentTarget.style.color='#C9A84C';}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,.09)';e.currentTarget.style.color='rgba(255,255,255,.7)';}}
            >{p.label}</button>
          ))}
        </div>
      </div>}

      {/* Main content */}
      <ColumnErrorBoundary>
        {isMobile
          ? <MobileLayout visibleCats={visibleCats} {...colProps} />
          : <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>
              <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,minHeight:0,overflow:'hidden'}}>
                {numPages>1&&(
                  <div style={{background:'#1C1A17',borderBottom:'0.5px solid rgba(255,255,255,.06)',padding:'8px 18px',display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
                    <button onClick={()=>setColPage(p=>(p-1+numPages)%numPages)} style={{padding:'10px 26px',borderRadius:10,cursor:'pointer',background:'rgba(255,255,255,.1)',border:'0.5px solid rgba(255,255,255,.18)',color:'rgba(255,255,255,.8)',fontSize:22,fontFamily:'DM Sans,sans-serif',fontWeight:500,lineHeight:1,transition:'all .15s'}}>←</button>
                    <div style={{flex:1,display:'flex',justifyContent:'center',gap:5}}>
                      {Array.from({length:numPages}).map((_,i)=>(
                        <div key={i} onClick={()=>setColPage(i)} style={{width:i===safePage?18:6,height:6,borderRadius:99,background:i===safePage?'#C9A84C':'rgba(255,255,255,.2)',cursor:'pointer',transition:'all .2s'}}/>
                      ))}
                    </div>
                    <button onClick={()=>setColPage(p=>(p+1)%numPages)} style={{padding:'10px 26px',borderRadius:10,cursor:'pointer',background:'rgba(201,168,76,.2)',border:'0.5px solid rgba(201,168,76,.35)',color:'#C9A84C',fontSize:22,fontFamily:'DM Sans,sans-serif',fontWeight:500,lineHeight:1,transition:'all .15s'}}>→</button>
                  </div>
                )}
                {(() => {
                  const slots = [];
                  let i = 0;
                  while (i < pageCats.length) {
                    const cat = pageCats[i];
                    const count = (activities[cat.id] || []).filter(a => !isFrontendBlocked(a)).length;
                    const nextCat = pageCats[i+1];
                    const nextCount = nextCat ? (activities[nextCat.id] || []).filter(a => !isFrontendBlocked(a)).length : 999;
                    if (count <= 3 && nextCat && nextCount <= 3) {
                      slots.push({ type:'stacked', cats:[cat, nextCat] });
                      i += 2;
                    } else {
                      slots.push({ type:'single', cat });
                      i += 1;
                    }
                  }
                  return (
                    <div onTouchStart={onTS} onTouchMove={onTM} onTouchEnd={onTE}
                      style={{flex:1,display:'grid',gridTemplateColumns:`repeat(${slots.length},1fr)`,minHeight:0,overflow:'hidden'}}
                    >
                      {slots.map(slot =>
                        slot.type === 'stacked'
                          ? <StackedColumn key={slot.cats.map(c=>c.id).join('+')} cats={slot.cats} {...colProps} />
                          : <CatColumn key={slot.cat.id} cat={slot.cat} {...colProps} />
                      )}
                    </div>
                  );
                })()}
              </div>
              <WeekendSidebar
                activities={activities}
                calQueue={calQueue}
                weather={weather}
                onCal={onCalendar}
                onWeather={onWeather}
                calendar={calendar}
                onEditCal={onEditCal}
              />
            </div>
        }
      </ColumnErrorBoundary>

      {/* Overlays */}
      {spotlightMode==='overlay'&&!overlayShown&&Object.values(activities).flat().length>0&&(
        <SpotlightOverlay activities={activities} onDismiss={()=>setOverlayShown(true)} onCal={onCalendar} />
      )}
      {showAsk&&<AskClaude settings={settings} activeProfile={activeProfile} onClose={()=>setShowAsk(false)} />}
      {aiPrompt&&<AIPromptModal prompt={aiPrompt} settings={settings} activeProfile={activeProfile} onClose={()=>setAiPrompt(null)} />}
      {reserveAct&&<ReserveModal activity={reserveAct.act} catId={reserveAct.catId} onClose={()=>setReserveAct(null)} homeAddress={homeAddress} />}
    </div>
  );
}
