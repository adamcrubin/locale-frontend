// ── eventEmoji.js ─────────────────────────────────────────────────────────
// Per-category emoji prefixes that hint at sub-type without a separate
// category column. Rendered in front of the event title inside CatColumn.
//
// - Sports: spectator (🏟) vs participation (🏃)
// - Music: venue-size signal — intimate 🕯 | mid ⛺ | large 🏟
// - Shopping: real event 🏷 | evergreen shop recommendation → no prefix
//
// Kept client-side (no backend change) so we can iterate quickly on venue
// lists without redeploying the API.

// Music venue → size tier. Partial (lowercase) match. Unknown venues
// default to `mid`, which felt right — most DC music lives at Black Cat /
// Lincoln / Birchmere / Union Stage class rooms.
const INTIMATE_VENUE_KEYWORDS = [
  'blues alley', 'jammin', 'pearl street', 'pie shop dc', 'songbyrd',
  'hill country', 'dc9', 'rhizome', 'atlas performing arts', 'millennium stage',
  'twins jazz', 'city winery', 'bossa bistro',
];
const LARGE_VENUE_KEYWORDS = [
  'the anthem', 'anthem at the wharf', 'wolf trap filene', 'filene center',
  'capital one arena', 'merriweather', 'eagle bank arena',
  'audi field', 'nationals park', 'fedex field', 'commanders field',
  'jiffy lube live',
];

function venueSizeTier(venue) {
  const v = (venue || '').toLowerCase();
  if (!v) return 'mid';
  if (INTIMATE_VENUE_KEYWORDS.some(k => v.includes(k))) return 'intimate';
  if (LARGE_VENUE_KEYWORDS.some(k => v.includes(k))) return 'large';
  return 'mid';
}

function musicEmoji(act) {
  const tier = venueSizeTier(act?.venue);
  if (tier === 'intimate') return '🕯';
  if (tier === 'large')    return '🏟';
  return '⛺';
}

// Pro-team keywords → treat as spectator sport. Everything else defaults to
// participation when the `spectator` tag is absent.
const PRO_SPORT_KEYWORDS = [
  'nationals', 'wizards', 'capitals', 'mystics', 'commanders',
  'dc united', 'washington spirit', 'spirit fc',
  'audi field', 'nationals park', 'capital one arena', 'fedex field',
  'commanders field', 'maryland soccerplex', 'eagle bank arena',
];

function sportsEmoji(act) {
  const tags = (act?.tags || []).map(t => (t || '').toLowerCase());
  if (tags.includes('spectator')) return '🏟';
  const blob = `${act?.venue || ''} ${act?.title || ''}`.toLowerCase();
  if (PRO_SPORT_KEYWORDS.some(k => blob.includes(k))) return '🏟';
  return '🏃';
}

function shoppingEmoji(act) {
  // Evergreen / recommendation items get no prefix (they're "cool shop"
  // rather than "real event" — intentionally quieter visually).
  const ct = act?.content_type;
  if (ct === 'evergreen' || ct === 'recommendation' || act?.is_pinned) return '';
  return '🏷';
}

// Public entry point — ActCard/CatColumn calls this to know what (if any)
// prefix to put in front of the title. Returns '' when no prefix applies.
export function titlePrefixForCategory(act, catId) {
  if (!act) return '';
  switch (catId) {
    case 'sports':   return sportsEmoji(act);
    case 'music':    return musicEmoji(act);
    case 'shopping': return shoppingEmoji(act);
    default:         return '';
  }
}
