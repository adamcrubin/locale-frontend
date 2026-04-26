import { ACTIVITIES as MOCK_ACTIVITIES, ALL_CATEGORIES } from '../../data/content';
import { dedupeActivities, isPastEvent, isFrontendBlocked, getTimeOfDay, getPriceTier } from './utils';
import { titlePrefixForCategory } from '../../lib/eventEmoji';
import ActCard from './ActCard';
import { SpotlightHero } from './Spotlight';

// Map a category id → its icon. Used by the Curated column to prefix each
// event with the emoji of the category it originated in.
const CAT_ICON_BY_ID = Object.fromEntries(ALL_CATEGORIES.map(c => [c.id, c.icon]));

// Given an event shown in the Curated or Other column, return the icon of
// its "home" category (first non-meta category in act.categories, or fallback
// to a generic ✨ if nothing is known).
function sourceCatIcon(act) {
  const cats = Array.isArray(act?.categories) ? act.categories : [];
  for (const c of cats) {
    if (c && c !== 'curated' && c !== 'other' && CAT_ICON_BY_ID[c]) return CAT_ICON_BY_ID[c];
  }
  return '✨';
}

export function CatColumn({ cat, activities, removed, onCal, onRemove, onHeart, onThumbUp, onThumbDown, onReserve, weatherDim, weatherBoost, homeAddress, profileId, spotlightMode, isMobile, timeFilters = [], priceFilters = [], hasConflict, crossCatSeen, curatedMode, viewMode = 'standard', isGuest = false, onGuestSignIn }) {
  const allActsUnsliced = dedupeActivities(
    (activities[cat.id]?.length>0 ? activities[cat.id] : MOCK_ACTIVITIES[cat.id]||[])
      .filter(a => !removed[`${cat.id}::${a.title}`])
      .filter(a => !isPastEvent(a))
      .filter(a => !isFrontendBlocked(a))
      // Cross-cat dedup intentionally removed — if Haiku tagged an event for
      // multiple categories, the user should see it in each of those columns
      // (previously it only appeared in whichever column rendered first).
      .filter(() => true)
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
  // Guest cap: 5 events per category, no relevancy ranking. The unsigned-in
  // experience is intentionally limited so users see the value before
  // committing to an account. Curated mode (a separate setting) also caps at 5.
  // For guests, re-sort by raw base_score (drop the per-profile relevancy
  // modifiers) — relevancy needs an account to learn from.
  const orderedActs = isGuest
    ? [...allActsUnsliced].sort((a, b) => (b.base_score || 0) - (a.base_score || 0))
    : allActsUnsliced;
  const guestCap = isGuest ? 5 : null;
  const cap = guestCap ?? (curatedMode ? 5 : null);
  const totalAvailable = orderedActs.length;
  const allActs = cap ? orderedActs.slice(0, cap) : orderedActs;
  const hiddenCount = cap ? Math.max(0, totalAvailable - cap) : 0;

  const isDimmed  = weatherDim.includes(cat.id);
  const isBoosted = weatherBoost.includes(cat.id);
  const showHero  = spotlightMode === 'hero';
  const isCurated = cat.id === 'curated';
  // The synthetic "Other" column also prefixes titles with the source-category
  // emoji (same treatment as Curated) so users can see which bucket each
  // merged-in event originally belonged to.
  const isOther   = cat.id === 'other';

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
          : allActs.map((a, idx)=>{
              // Compute title prefix:
              // - Curated or Other column: emoji of the source category the event came from
              // - Music / sports / shopping columns: sub-type hint (venue size,
              //   spectator-vs-participation, event-vs-evergreen-shop)
              // - Everything else: no prefix
              const catPrefix = (isCurated || isOther) ? sourceCatIcon(a) : titlePrefixForCategory(a, cat.id);
              const prefixedTitle = catPrefix ? `${catPrefix} ${a.title}` : a.title;
              // First card in the Curated column = Spotlight (highest base_score).
              // Renders with violet styling and starts expanded.
              const isSpotlightCard = isCurated && idx === 0;
              return (
              <ActCard key={a.title}
                act={{
                  ...a,
                  _conflict: hasConflict?.(a),
                  title: prefixedTitle,
                }}
                catId={cat.id}
                isSpotlight={isSpotlightCard}
                cardBg={isCurated && !isSpotlightCard ? curatedCardBg : undefined}
                onCal={onCal}
                onRemove={()=>onRemove(cat.id,a)}
                onHeart={()=>onHeart(cat.id,a)}
                onThumbUp={()=>onThumbUp(cat.id,a)}
                onThumbDown={()=>onThumbDown(cat.id,a)}
                onReserve={onReserve}
                homeAddress={homeAddress}
                profileId={profileId}
                viewMode={viewMode}
              />
              );
            })
        }
        {/* Guest sign-in CTA — only in browse-without-account mode AND only
            when there's actually more content the guest isn't seeing.
            Persistent at the bottom of each column so any scroll lands on it. */}
        {isGuest && hiddenCount > 0 && (
          <button
            onClick={() => onGuestSignIn?.('see-more')}
            style={{
              marginTop: 4, padding: '10px 12px', borderRadius: 10,
              background: 'rgba(201,168,76,.10)',
              border: '0.5px dashed rgba(201,168,76,.45)',
              color: '#8B6D2D', fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', textAlign: 'center', lineHeight: 1.4,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,.10)'; }}
          >
            ✦ Sign in to see {hiddenCount} more {cat.label.toLowerCase()} {hiddenCount === 1 ? 'event' : 'events'}
          </button>
        )}
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
