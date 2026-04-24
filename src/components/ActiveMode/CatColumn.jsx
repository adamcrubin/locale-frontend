import { ACTIVITIES as MOCK_ACTIVITIES, ALL_CATEGORIES } from '../../data/content';
import { dedupeActivities, isPastEvent, isFrontendBlocked, getTimeOfDay, getPriceTier } from './utils';
import ActCard from './ActCard';
import { SpotlightHero } from './Spotlight';

// Map a category id → its icon. Used by the Curated column to prefix each
// event with the emoji of the category it originated in.
const CAT_ICON_BY_ID = Object.fromEntries(ALL_CATEGORIES.map(c => [c.id, c.icon]));

// Given a curated event, return the icon of its "home" category (first non-curated
// category in act.categories, or fallback to a generic ✨ if nothing is known).
function sourceCatIcon(act) {
  const cats = Array.isArray(act?.categories) ? act.categories : [];
  for (const c of cats) {
    if (c && c !== 'curated' && CAT_ICON_BY_ID[c]) return CAT_ICON_BY_ID[c];
  }
  return '✨';
}

export function CatColumn({ cat, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, spotlightMode, isMobile, timeFilters = [], priceFilters = [], hasConflict, crossCatSeen, curatedMode }) {
  const allActsUnsliced = dedupeActivities(
    (activities[cat.id]?.length>0 ? activities[cat.id] : MOCK_ACTIVITIES[cat.id]||[])
      .filter(a => !removed[`${cat.id}::${a.title}`])
      .filter(a => !isPastEvent(a))
      .filter(a => !isFrontendBlocked(a))
      .filter(a => {
        if (crossCatSeen) {
          const key = (a.title||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,40);
          if (crossCatSeen.has(key)) return false;
          crossCatSeen.add(key);
        }
        return true;
      })
      .filter(a => {
        // Multi-select time filter. Empty array = show all.
        // "any"-tagged events (no time info) surface regardless of selection.
        if (!timeFilters?.length) return true;
        const tod = getTimeOfDay(a);
        return timeFilters.includes(tod) || tod === 'any';
      })
      .filter(a => {
        // Multi-select price filter. Empty array = show all.
        // When any specific tier is selected, unknowns are hidden — matches
        // desktop behavior so "Free only" doesn't surface mystery-priced items.
        if (!priceFilters?.length) return true;
        const tier = getPriceTier(a);
        if (tier === 'unknown') return false;
        return priceFilters.includes(tier);
      })
  );
  const allActs = curatedMode ? allActsUnsliced.slice(0, 5) : allActsUnsliced;

  const isDimmed  = weatherDim.includes(cat.id);
  const isBoosted = weatherBoost.includes(cat.id);
  const showHero  = spotlightMode === 'hero';
  const isCurated = cat.id === 'curated';

  // Curated column gets a subtly distinct column background + card tint so
  // it reads as a "special" lane at a glance (not just via header label).
  const columnBg = isCurated ? '#EEE8D9' : '#F4F1EB';
  const curatedCardBg = 'rgba(201,168,76,.08)';

  return (
    <div style={{display:'flex',flexDirection:'column',borderRight:'0.5px solid var(--border)',minWidth:0,minHeight:0,overflow:'hidden',opacity:isDimmed?0.65:1,transition:'opacity .3s'}}>
      <div className={`${cat.cls}`} style={{padding:'10px 20px 9px',display:'flex',flexDirection:'column',alignItems:'center',gap:3,flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:9,width:'100%'}}>
          <span style={{fontSize:14}}>{cat.icon}</span>
          <span style={{fontSize:12,fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',textAlign:'center',flex:1}}>{cat.label}</span>
          <span style={{fontSize:14}}>{cat.icon}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5}}>
          {isBoosted&&<span style={{fontSize:9,background:'rgba(0,0,0,.12)',padding:'1px 5px',borderRadius:99}}>☀ great today</span>}
          {isDimmed&&<span style={{fontSize:9,background:'rgba(0,0,0,.12)',padding:'1px 5px',borderRadius:99}}>🌧 rain</span>}
          <span style={{fontSize:10,opacity:.45}}>{allActs.length}</span>
        </div>
      </div>
      <div style={{flex:1,overflowY:'auto',padding:'10px 8px',display:'flex',flexDirection:'column',gap:8,background:columnBg,minHeight:0}}>
        {showHero && <SpotlightHero activities={{[cat.id]:allActs}} onCal={onCal} />}
        {allActs.length===0
          ? <div style={{padding:'12px 4px',fontSize:11,color:'#B8B3AA',fontStyle:'italic'}}>Nothing here -- check back Thursday</div>
          : allActs.map(a=>(
              <ActCard key={a.title}
                act={{
                  ...a,
                  _conflict: hasConflict?.(a),
                  // In the Curated column, prefix the title with the source-category
                  // emoji so users can see which lane the event originated from.
                  title: isCurated ? `${sourceCatIcon(a)} ${a.title}` : a.title,
                }}
                catId={cat.id}
                cardBg={isCurated ? curatedCardBg : undefined}
                onCal={onCal}
                onRemove={()=>onRemove(cat.id,a)}
                onHeart={()=>onHeart(cat.id,a)}
                onThumbUp={()=>onThumbUp(cat.id,a)}
                onThumbDown={()=>onThumbDown(cat.id,a)}
                onReserve={onReserve}
                homeAddress={homeAddress}
                profileId={profileId}
              />
            ))
        }
      </div>
    </div>
  );
}

// NOTE: do NOT destructure `activities` here — it must stay in colProps so CatColumn receives it.
export function StackedColumn({ cats, ...colProps }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', borderRight:'0.5px solid var(--border)', minWidth:0, minHeight:0, overflow:'hidden' }}>
      {cats.map((cat, i) => (
        <div key={cat.id} style={{
          flex: 1, display:'flex', flexDirection:'column', minHeight:0,
          borderBottom: i < cats.length-1 ? '1px solid var(--border)' : 'none',
          overflow: 'hidden',
        }}>
          <CatColumn cat={cat} {...colProps} />
        </div>
      ))}
    </div>
  );
}
