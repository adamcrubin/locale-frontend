import { ACTIVITIES as MOCK_ACTIVITIES, WEATHER as MOCK_WEATHER } from '../../data/content';

// Keep in sync with BLOCKLIST in extractor.js (backend is primary; this is the safety net).
export const FRONTEND_BLOCKLIST = [
  'support group','surgery support','rotator cuff','online healing','online session',
  'virtual event','webinar','zoom meeting','online only','certification course',
  'ceu credits','continuing education','hoa meeting','homeowners association',
  'aa meeting','na meeting','anonymous meeting','recovery meeting',
  'therapy session','counseling session','mental health workshop',
  'timeshare','real estate seminar','investment seminar','insurance seminar',
  'civic federation','civic meeting','neighborhood meeting','town hall meeting',
  'wound care','shoulder surgery',
  'religious service','church service','bible study',
];

export function isFrontendBlocked(act) {
  const combined = `${(act.title||'')} ${(act.description||'')}`.toLowerCase();
  return FRONTEND_BLOCKLIST.some(kw => combined.includes(kw));
}

export function isRestaurant(act) {
  const cats = act.categories || [];
  const tags = (act.tags || []).map(t => t.toLowerCase());
  const title = (act.title || '').toLowerCase();
  if (!cats.includes('food')) return false;
  if (act.start_date) return false;
  const eventKeywords = [
    'festival','fest','fair','tasting','dinner','brunch','pop-up','popup',
    'market','competition','contest','class','workshop','tour','show','concert',
    'celebration','party','gala','night','week','weekend','event','experience',
    'gathering','happy hour','trivia','game','championship',
  ];
  return !eventKeywords.some(kw => title.includes(kw) || tags.includes(kw));
}

export function formatTimeStr(raw) {
  if (!raw) return '';
  const m = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|AM|PM)/i);
  if (!m) return '';
  const h = parseInt(m[1]);
  const mins = m[2] && m[2] !== '00' ? `:${m[2]}` : '';
  const period = m[3].replace(/\./g,'').toLowerCase();
  return `${h}${mins}${period}`;
}

const MUSIC_GENRES = ['jazz','classical','rock','folk','blues','electronic','hip-hop','country','r&b','indie','soul','reggae','punk','metal','pop','funk','gospel','latin','afrobeat','bluegrass','acoustic','orchestra','opera','rap','ambient'];
export function formatMusicGenre(act) {
  if (!(act.categories||[]).includes('music')) return null;
  const tags = (act.tags||[]).map(t=>t.toLowerCase());
  const genre = tags.find(t => MUSIC_GENRES.includes(t));
  if (!genre) return null;
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

const SPORT_EMOJI = {
  basketball:'🏀', nba:'🏀', wnba:'🏀',
  football:'🏈', nfl:'🏈',
  baseball:'⚾', mlb:'⚾',
  hockey:'🏒', nhl:'🏒',
  soccer:'⚽', mls:'⚽', futbol:'⚽',
  tennis:'🎾',
  golf:'⛳', pga:'⛳',
  boxing:'🥊', mma:'🥊', ufc:'🥊',
  volleyball:'🏐',
  running:'🏃', marathon:'🏃', '5k':'🏃', '10k':'🏃',
  cycling:'🚴', bike:'🚴',
  swim:'🏊', swimming:'🏊',
  rugby:'🏉',
  lacrosse:'🥍',
  hiking:'🥾',
  skate:'⛸', skating:'⛸',
  ski:'🎿', skiing:'🎿',
};
export function formatSportsEmoji(act) {
  if (!(act.categories||[]).includes('sports')) return null;
  const hay = [
    ...(act.tags||[]),
    act.title || '',
    act.description || '',
    act.subcategory || '',
  ].join(' ').toLowerCase();
  for (const key of Object.keys(SPORT_EMOJI)) {
    const re = new RegExp(`\\b${key}\\b`);
    if (re.test(hay)) return { emoji: SPORT_EMOJI[key], label: key.charAt(0).toUpperCase() + key.slice(1) };
  }
  return null;
}

export function formatWhen(act) {
  if (isRestaurant(act)) return '';
  const raw = (act.when_display || act.when || '').trim();
  const startTime = act.start_time || '';
  const endTime   = act.end_time   || '';

  const lower = raw.toLowerCase();
  let day = '';
  if (lower.includes('friday')   || /^fri\b/.test(lower)) day = 'Fri';
  else if (lower.includes('saturday') || /^sat\b/.test(lower)) day = 'Sat';
  else if (lower.includes('sunday')   || /^sun\b/.test(lower)) day = 'Sun';
  else if (lower.includes('through') || lower.includes('thru') || lower.includes('–') || lower.includes(' - ')) {
    day = 'Fri–Sun';
  }

  if (!day && act.start_date) {
    const d = new Date(act.start_date + 'T12:00:00');
    if (!isNaN(d.getTime())) {
      const dow = d.getDay();
      if (dow === 5) day = 'Fri';
      else if (dow === 6) day = 'Sat';
      else if (dow === 0) day = 'Sun';
    }
  }

  let dateShort = '';
  if (act.start_date) {
    const d = new Date(act.start_date + 'T12:00:00');
    if (!isNaN(d.getTime())) dateShort = `(${d.getMonth()+1}/${d.getDate()})`;
  }

  let timeStr = '';
  const t1 = formatTimeStr(startTime) || formatTimeStr(raw.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/i)?.[0] || '');
  const t2 = formatTimeStr(endTime);

  if (t1 && t2) timeStr = `${t1}–${t2}`;
  else if (t1) timeStr = t1;
  else if (/all.?day/i.test(raw)) timeStr = 'All day';

  if (!timeStr) {
    const combined = `${lower} ${(act.tags||[]).join(' ').toLowerCase()} ${(act.categories||[]).join(' ')}`;
    if (combined.includes('morning') || combined.includes('breakfast') || combined.includes('brunch')) timeStr = 'Morning';
    else if (combined.includes('evening') || combined.includes('night') || combined.includes('dinner') || combined.includes('music') || combined.includes('concert') || combined.includes('show')) timeStr = 'Evening';
    else if (combined.includes('afternoon') || combined.includes('lunch') || combined.includes('midday')) timeStr = 'Afternoon';
    else timeStr = 'Anytime';
  }

  const dayWithDate = [day, dateShort].filter(Boolean).join(' ');
  return [dayWithDate, timeStr].filter(Boolean).join(' · ');
}

export function formatVenue(act) {
  const venue = act.venue || act.where || '';
  const neighborhood = act.neighborhood || '';
  const place = neighborhood || venue;
  if (!place) return '';
  return place
    .replace(/,?\s*(Washington|DC|Falls Church|Arlington|Alexandria|Northern Virginia|NoVA|VA|MD)\b.*/gi, '')
    .trim()
    .slice(0, 30);
}

const JUNK_COSTS = [
  'see details','check website','varies','tbd','register','visit website',
  'zoo admission','general admission','tickets required','price varies',
  'contact organizer','check eventbrite','more info','see website',
  'ticket required','admission','check schedule',
];

const COST_HINTS = {
  food:     '$$ (?)',
  music:    '$$ (?)',
  sports:   '$$ (?)',
  arts:     '$ (?)',
  outdoors: 'Free (?)',
  miss:     '$$ (?)',
  nerdy:    '$ (?)',
  away:     '$$$ (?)',
  trips:    '$$ (?)',
  breweries:'$ (?)',
  comedy:   '$$ (?)',
  markets:  'Free (?)',
  wellness: '$$ (?)',
  family:   '$ (?)',
  film:     '$ (?)',
};

export function formatCost(act) {
  const raw = (act.cost_display || act.cost || '').toLowerCase().trim();
  if (!raw || JUNK_COSTS.some(j => raw.includes(j))) {
    const cats = act.categories || [];
    for (const cat of cats) {
      if (COST_HINTS[cat]) return COST_HINTS[cat];
    }
    return '$? (?)';
  }
  if (!raw.includes('$') && !raw.includes('free')) {
    const cats = act.categories || [];
    for (const cat of cats) {
      if (COST_HINTS[cat]) return COST_HINTS[cat];
    }
    return '$? (?)';
  }
  return act.cost_display || act.cost || '';
}

export function dedupeActivities(acts) {
  const seen = new Set();
  return acts.filter(a => {
    const key = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Price tier for filter chips.
// Returns 'free' | '$' | '$$' | '$$$' | 'unknown'.
// Prefers cost_cents_max (backend), falls back to parsing cost_display/cost strings
// so mock data ("$45/person", "Free") still bucket correctly.
//
// Buckets: Free ($0), $ (≤$25), $$ ($26–$75), $$$ ($76+).
export function getPriceTier(act) {
  const costStr = (act.cost_display || act.cost || '').toLowerCase();
  if (act.is_free === true || costStr === 'free' || costStr === '$0') return 'free';
  // Prefer numeric backend field when set. 0/0 = free.
  if (act.cost_cents_max === 0 && act.cost_cents_min === 0) return 'free';
  let priceDollars = null;
  if (typeof act.cost_cents_max === 'number' && act.cost_cents_max > 0) {
    priceDollars = act.cost_cents_max / 100;
  } else if (costStr) {
    const nums = costStr.match(/\d+(?:\.\d+)?/g);
    if (nums?.length) priceDollars = Math.max(...nums.map(parseFloat));
  }
  if (priceDollars == null) return 'unknown';
  if (priceDollars === 0)   return 'free';
  if (priceDollars <= 25)   return '$';
  if (priceDollars <= 75)   return '$$';
  return '$$$';
}

export function getTimeOfDay(act) {
  const when = (act.start_time || act.when_display || act.when || '').toLowerCase();
  const m = when.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (!m) return 'any';
  let h = parseInt(m[1]);
  if (m[3] === 'pm' && h !== 12) h += 12;
  if (m[3] === 'am' && h === 12) h = 0;
  if (h < 12) return 'morning';
  if (h < 17) return 'midday';
  return 'night';
}

export function getWeekendWeather(weather) {
  const days = (weather?.length > 0) ? weather : MOCK_WEATHER;
  const fri = days.find(d => d.day?.toLowerCase().startsWith('fri'));
  const sat = days.find(d => d.day?.toLowerCase().startsWith('sat'));
  const sun = days.find(d => d.day?.toLowerCase().startsWith('sun'));
  return (fri && sat && sun) ? [fri, sat, sun] : days.slice(0, 3);
}

export function getWeatherBoost(weather) {
  const sat = getWeekendWeather(weather)[1] || {};
  if ((sat.precip || 0) > 50) return { boost:['arts','music','food','nerdy'], dim:['outdoors'] };
  if ((sat.hi || 0) > 70 && (sat.precip || 0) < 20) return { boost:['outdoors'], dim:[] };
  return { boost:[], dim:[] };
}

export function getWeekendDateStr() {
  const now = new Date();
  const day = now.getDay();
  let daysToFri = (5 - day + 7) % 7;
  if (day === 6) daysToFri = 6; else if (day === 0) daysToFri = 5;
  const fri = new Date(now); fri.setDate(now.getDate() + (day === 6 ? -1 : day === 0 ? -2 : daysToFri));
  const sat = new Date(fri); sat.setDate(fri.getDate() + 1);
  const sun = new Date(fri); sun.setDate(fri.getDate() + 2);
  const fmtShort = d => d.toLocaleDateString('en-US', { month:'short', day:'numeric' });
  return { satStr:fmtShort(sat), sunStr:fmtShort(sun), sat, sun };
}

// Past-event detection.
//
// Old version compared day-of-week names — buggy because dayOrder was
// sun-first, so a Saturday event on Sunday had eventIdx(6) NOT < todayIdx(0)
// and stayed visible all of Sunday and Monday.
//
// New version: prefer start_date / end_date comparison — that's the actual
// event date the extractor pinned. Falls back to the day-of-week heuristic
// only when no date is present (recurring evergreens, undated activities).
export function isPastEvent(act) {
  // 1. Date-based check (most reliable). An event "ends" at the end of its
  //    end_date (or start_date if no end). Anything before "now" is past.
  if (act.start_date) {
    const dateStr = act.end_date || act.start_date;
    // Compare by treating the event as "current" through 11:59pm of its end day
    const eventEnd = new Date(`${dateStr}T23:59:59`);
    if (!isNaN(eventEnd) && eventEnd.getTime() < Date.now()) return true;
    return false;
  }
  // 2. Fallback: day-of-week heuristic for events without a real date.
  //    weekend window only — if event mentions a past weekend day we already
  //    passed this week, mark past. Doesn't trigger for recurring evergreens
  //    that just say "Sat" with no specific date — those are caught above
  //    when start_date is filled in by the recurring-occurrence logic.
  const when = (act.when || '').toLowerCase();
  if (!when) return false;
  const today = new Date().getDay(); // 0=Sun..6=Sat
  const dayMatches = {
    fri: when.includes('fri'),
    sat: when.includes('sat'),
    sun: when.includes('sun'),
  };
  // weekend ordering: Fri(5) < Sat(6) < Sun(0). We're past a weekend day if
  // today is later in the same weekend OR it's Mon-Thu (weekend over).
  if (today === 0 /* Sun */) {
    // Past Fri or Sat means the event already happened this weekend
    if (dayMatches.fri || dayMatches.sat) {
      // Only past if event ONLY mentions those days — not "Fri-Sun"
      if (!dayMatches.sun) return true;
    }
    return false;
  }
  if (today >= 1 && today <= 4 /* Mon-Thu */) {
    // Whole weekend is over (no clear "next weekend" cue in the day-name string)
    if (dayMatches.fri || dayMatches.sat || dayMatches.sun) return true;
  }
  if (today === 6 /* Sat */) {
    if (dayMatches.fri && !dayMatches.sat && !dayMatches.sun) return true;
  }
  return false;
}

export function sortCategoriesByRelevancy(cats, activities) {
  return [...cats].sort((a, b) => {
    const aScore = (activities[a.id] || MOCK_ACTIVITIES[a.id] || [])
      .reduce((s, e) => s + (e.final_score || e.base_score || 0.5), 0);
    const bScore = (activities[b.id] || MOCK_ACTIVITIES[b.id] || [])
      .reduce((s, e) => s + (e.final_score || e.base_score || 0.5), 0);
    return bScore - aScore;
  });
}
