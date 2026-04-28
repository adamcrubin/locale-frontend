# Locale — Design Document
*Last updated: April 2026*

---

## What Is Locale?

Locale is a personal weekend planner for Falls Church, VA (and eventually any metro area). It answers one question: **"What should we do this weekend?"** — and does it without requiring any input beyond opening the app.

It's not a general-purpose events app. It's a curated, opinionated feed for two specific people (Adam and Kailee) that learns their preferences, accounts for weather, avoids things they hate, and surfaces the 15-20 best options per category in a clean, newspaper-like layout.

The design philosophy: **a beautiful Sunday paper, not a search engine.**

---

## Core Design Principles

1. **Zero friction** — The app opens to a full, loaded feed. No search, no filters, no setup.
2. **Opinionated curation** — Events are scored and ranked. Low-quality events are hidden. The top pick is always front-and-center.
3. **Personal without being needy** — The relevancy engine adapts to preferences quietly. The user doesn't manage a complex profile.
4. **Weekend-native** — Everything is anchored to Fri–Sun. Time displays ("Sat 8PM") are always relative to this weekend.
5. **Beautiful** — Cormorant Garamond + DM Sans. Warm cream tones. Cards feel like a magazine, not a database.
6. **No cold starts (from the user's perspective)** — localStorage caching means the app always shows the last-good feed instantly, then refreshes in the background.

---

## Information Architecture

### The Feed (Weekend Mode)

The main screen is a horizontal paginated grid of category columns. Each column shows all events in that category, scored by relevancy.

**Columns per page:** 4 on desktop, 1 on mobile  
**Pages:** Paginated with arrow nav + swipe  
**Column order:** Sorted by total relevancy score (most events = left)

**Categories (14):**
| Category | Icon | Color |
|----------|------|-------|
| Outdoors | 🌿 | Green |
| Food & Dining | 🍽 | Red-orange |
| Arts & Culture | 🎨 | Purple |
| Live Music | 🎵 | Pink |
| Sports | ⚽ | Blue |
| Weekend Away | 🧳 | Violet |
| Day Trips | 🗺 | Teal |
| Nerdy/Talks | 🔭 | Indigo |
| Breweries | 🍺 | Amber |
| Comedy | 😂 | Yellow |
| Film | 🎬 | Gray-blue |
| Wellness | 🧘 | Sage |
| Family | 👨‍👩‍👧 | Orange |
| Markets | 🛒 | Lime |

### Event Cards

Each card shows:
- **Title** (bold, truncated if compact)
- **Subheader**: `[Day + Time] · [Venue/Neighborhood] · [Cost]`
  - Music events also show a genre badge (e.g. "Jazz")
  - If the event is a ticketed show, a gold 🎟 button appears
- **Action bar** (on expand): 📅 calendar, 📍 directions, 🎟 tickets (if available), 🔗 info link, ↗ share, ♥ save, 👍👎 feedback
- **Description** (on expand)

### Right Sidebar (Desktop)

- **⭐ Top Pick**: The single highest-scored event of the weekend
- **Your Weekend**: Fri/Sat/Sun calendar sections, weather badges, Google Calendar events

### Header

- **Locale** wordmark + city
- Weekend / Weeknight toggle
- Theme toggle (Hearthside, Parchment, Dark, etc.)
- Profile avatar + name
- Pipeline indicator (pulsing amber dot when scraping or extracting)
- Ask Claude button

### Quick Prompts Bar

Generic AI prompts: Plan my Saturday, Date night, What can I do right now?, Free this weekend, Rainy Sunday, Hidden gems, Kid-friendly, Weekend away

### Spotlight

Optional overlay or strip showing the top event of the weekend with dramatic treatment.

---

## Visual Design

### Typography
- **Display / headings**: Cormorant Garamond (serif, editorial weight)
- **Body / UI**: DM Sans (sans-serif, clean)

### Hearthside Theme (default)
- Background: `#F4F1EB` (warm cream)
- Surface: `#FFFFFF`
- Dark header: `#1C1A17`
- Accent: `#C9A84C` (warm gold)
- Text: `#1C1A17`

### Additional Themes
- **Parchment**: Slightly warmer, newspaper feel
- **Terminal**: Green on black, monospace
- **Brutalist**: High contrast, thick borders
- **Neon**: Dark with vibrant accents
- **Paper**: Warm cream newspaper

---

## Profiles

Each profile has:
- Name, color, avatar
- **Preferences** (tags): e.g. "hiking", "jazz", "craft beer", "museums"
- **Category states** per category: `always` | `sometimes` | `never`
  - `always` = shown and prioritized
  - `sometimes` = shown on 2nd page
  - `never` = hidden
- Saved items
- Category states control which columns appear and on which page

**Relevancy scoring** uses profile prefs to boost events with matching tags/categories.

---

## Settings

- City (with zip code for event lookup)
- Home address (for Google Maps directions)
- Refresh interval
- Curated mode (max 5 events per category — less choice, less paralysis)
- Spotlight style (none, strip, hero, overlay)
- Column order (relevancy or random)
- Google Calendar connection
- Ambient mode timeout
- Test mode

---

## Modes

| Mode | Description |
|------|-------------|
| **Weekend** | Main mode, Fri–Sun events |
| **Weeknight** | Mon–Thu condensed view |
| **Ambient** | Full-screen photo slideshow with top event overlay, auto-cycles |
| **Ask Claude** | Free-text chat with Claude about the weekend |

---

## State Management

All state lives in `App.jsx` and flows down as props. No Redux/Zustand.

Key state:
- `settings` — persisted to localStorage
- `profiles` / `activeProfile` — persisted to localStorage
- `activities` — from `useActivities` hook (cached in localStorage, refreshed from API)
- `weather` — from `useWeather` hook
- `calQueue` — calendar events added during this session

---

## Data Flow (User Perspective)

```
App opens
  → Read localStorage: settings, profiles, cached activities
  → Render feed immediately from cache (no loading state!)
  → In background: fetch fresh activities from API
  → Swap in live data when ready (seamless)
  → Poll pipeline-status every 8s → show indicator if running
```

---

## Key UX Decisions

### Why no search?
Search implies the user knows what they want. Locale is for discovery — "surprise me, but make it relevant."

### Why paginated columns instead of infinite scroll?
Columns give a mental model: "I'm in the Music page now." Pagination makes the set feel curated, not infinite. You always know how much is there.

### Why localStorage cache?
Render.com free tier cold starts take 30-60 seconds. Without caching, the app shows mock data for a minute on every fresh load. With 5-minute localStorage TTL, repeat visits feel instant.

### Why the right sidebar?
It anchors the weekend. Seeing Fri/Sat/Sun with weather and your existing plans changes the question from "what's happening?" to "what fits into my weekend?" That's a much better framing.

---

## Component Map

```
App.jsx
├── ProfileSelectScreen
├── OnboardingFlow
├── ActiveMode (main weekend view)
│   ├── Header (logo, nav, pipeline indicator)
│   ├── QuickPromptsBar
│   ├── SpotlightStrip / SpotlightHero / SpotlightOverlay
│   ├── CatColumn[] (one per visible category)
│   │   └── ActCard[] (one per event)
│   │       └── ActionBar
│   ├── WeekendSidebar (desktop)
│   └── PageNav (arrows + dots)
├── WeekdayMode
├── AmbientMode
├── SettingsScreen
├── SourcesScreen (admin)
├── CalendarModal
├── AIPromptModal
└── WeatherScreen
```

---

## API Surface

Frontend talks to one backend: `https://locale-backend.onrender.com/api`

Key endpoints consumed by frontend:
| Endpoint | Purpose |
|----------|---------|
| GET `/events?zip=&profileId=&city=` | Main feed (scored events per category) |
| GET `/weather?city=` | Weekend forecast |
| GET `/pipeline-status` | Scraping/extracting indicator |
| POST `/events/feedback` | 👍👎 feedback |
| GET `/prompts/:label` | Quick prompt AI responses |
| POST `/ask` | Free-text Claude chat |
| GET `/calendar/events` | Google Calendar events |
| POST `/calendar/add` | Add event to Google Calendar |
| GET `/auth/google` | Start OAuth |
| GET `/auth/google/callback` | OAuth callback |
| GET `/auth/google/status` | Check connection |

---

## Deployment

| Layer | Platform | Trigger |
|-------|----------|---------|
| Frontend | Netlify | Push to `adamcrubin/locale-frontend` main |
| Backend | Render.com (free) | Push to `adamcrubin/locale` main |
| Database | Supabase Postgres | Managed |

**Frontend env vars** (Netlify):
- `VITE_API_URL` = `https://locale-backend.onrender.com/api`

**Backend env vars** (Render):
- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `ANTHROPIC_API_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `EVENTBRITE_TOKEN`, `FRONTEND_URL`

---

## Known Limitations (as of April 2026)

| Issue | Status | Mitigation |
|-------|--------|-----------|
| Render free tier cold start (30-60s) | Active | localStorage cache; upgrade to paid if used daily |
| Event data quality varies by source | Active | Extraction prompt tuning; isRestaurant() heuristics |
| JS-rendered source sites | Partially mitigated | BLOCKED_SITES list → web search fallback |
| Content hash collisions (venue name drift) | Rare | Manual PATCH /admin/events/:id endpoint |
| when_display missing for some events | Active | formatWhen() falls back to start_date + time inference |
| Google Calendar: only one user | By design | profileId used as storage key |

---

## Recent Changes (2026-04-24)

**UI / Mode changes**
- **New "Curated" category** — virtual category computed at render time in `App.jsx` as top-10 scored items across all real categories (dedup by normalized title). Appears first in `ALL_CATEGORIES` in `data/content.js`. Items still appear in their own categories.
- **Time filter moved** to fixed position on the left side of the top bar (`left:320`).
- **"✏️ Ask Anything" button** folded into `QUICK_PROMPTS` as a 4th canned prompt — uniform UX with the other three.
- **Sports emoji tag** (`formatSportsEmoji` in `ActiveMode.jsx`) — mirrors `formatMusicGenre`; maps tags/title/description to emoji + label (🏀 Basketball, 🏈 Football, ⚽ Soccer, 🏃 Running, etc.) and renders a green pill next to the music-genre pill.
- **Mobile duplication fix** — `MobileLayout` now runs `dedupeActivities()` and `isFrontendBlocked` filters that only `CatColumn` had. Clicking between categories no longer stacks duplicates (events tagged under multiple categories were being shown multiple times).

**Link quality**
- **Ticket URL validation** — `ActionBar` hides the Ticket button unless the URL is event-specific. Bare aggregator domains (ticketmaster, livenation, stubhub, seatgeek, axs, eventbrite, resy, opentable) without a numeric path component are treated as non-specific.
- **"Link" fallback** — when `act.url` is missing, uses Google's `btnI=1` ("I'm Feeling Lucky") with `-pinterest -facebook` filters to jump straight to the top organic result instead of a search page.

**Weather**
- **Hourly precipitation** now reads `probabilityOfPrecipitation.value` from NWS hourly API instead of regex-scraping `shortForecast`. Daily forecasts do the same (fallback to regex). Was consistently returning 0; now accurate.

**Known critical risks** (from 2026-04 codebase scan — not yet fixed)
- `/admin/*` routes have no auth → anyone can `DELETE /api/admin/*`.
- `profileId='default'` IDOR on Google OAuth token storage — any caller can read/write any user's tokens by guessing the profile id.
- No Supabase RLS evidence; open CORS; `/auth/google/callback` writes HTML without escaping.

---

## Changes 2026-04-25

**Demo-mode gating** — `!user && demoMode` users now see a `LoginPromptModal` when they click gated features. Gated: save/heart, thumbs up/down, calendar add, settings save, profile switch/create, saved items, AI prompts (Ask + Quick prompts), reserve. Open to demo: browsing, external links (ticket/info/directions/share), category nav, time filter, column reorder. Profile avatar hidden in demo; replaced with a gold "Sign in" pill.

**Source authority tier** — `calculateBaseScore(evt, sourceName)` now adds ±0.15 based on source:
- Tier A (+0.15): WaPo / Washingtonian / NYT / Axios / Northern Virginia Magazine
- Tier B (+0.08): DCist / Eater / Thrillist / Timeout / City Paper / Bisnow
- Tier C (0): venue sites, neighborhood blogs (default)
- Tier D (-0.05): bare listing feeds

Pattern match on `sources.name`; see `getSourceAuthorityBoost` in `extractor.js`.

---

## Changes 2026-04-27 (data-quality round)

A round triggered by "the feed looks empty on Monday." Single root cause —
the extractor was setting `expires_at` to "this weekend's Sunday" regardless
of when the event actually was, so future-weekend events landed in the DB
already-expired and got flagged inactive on the next pass. Fixing it
surfaced a few related issues that all got addressed at once.

### `expires_at` heal

The fix is layered:
1. **Extractor compute logic.** `expires_at = COALESCE(end_date, start_date) +
   23:59:59`, falling back to `NOW() + 30 days` if neither is known. The old
   "end of this weekend" default is gone.
2. **UPSERT refresh.** ON CONFLICT now updates `expires_at` and reactivates
   the row when the new value is in the future. Without this, stale rows
   from before the fix never self-healed because re-extraction couldn't
   touch the column.
3. **Boot-time data heal.** `healStaleEventExpiry()` in db.js recomputes
   `expires_at` for any row where it's NULL or already-past while
   `start_date` is upcoming, then reactivates affected rows. Idempotent
   (only matches rows that need fixing) so it's safe to run on every boot.

### Auto-pause: days-since-last-event, scaled by track record

Old policy was "3 consecutive empty extraction runs → pause." With the
stricter "skip events > 6 weeks out" extraction prompt, top-yielding sources
were producing 0 events in a single run for legitimate reasons and getting
killed permanently. New policy:

- Pause threshold scales by lifetime track record:
  - 0–5 lifetime events  → 14 days idle before pause
  - 6–20 lifetime events → 30 days
  - 21+ lifetime events  → 45 days
- "Idle" is measured as `MAX(extracted_at)` from the events table, not a
  per-run strike counter. Cache-skipped runs (when raw_text hash matches
  the prior run) don't count, so dormant pages don't accumulate strikes.
- Boot-time `unpauseLegacyAutoPaused()` reactivates every source whose
  `last_error` matches the old strike-rule format. One-time cleanup.

Brand-new sources with zero lifetime events skip the pause check entirely
on a single empty run — they get an implicit grace window from creation.

### Cross-source dedup

\`content_hash\` (title + start_date with normalized title) misses variants
where promotional prefixes change the hash:

- "Throwback Night: Spirit vs Current" / "Washington Spirit Home Match
  vs Kansas City Current" / "Washington Spirit Game" — three sources,
  three hashes, one game.
- "Premiere: Hamilton at Kennedy Center" / "Hamilton at Kennedy Center" —
  two hashes, one show.

Two layers handle this:

1. **Pre-hash title normalization** strips promotional prefixes
   (Throwback Night:, Premiere:, Featured:, Now Showing:, Opening Weekend:,
   Sponsored:, Spotlight:, …) and trailing parentheticals
   ((Matinee), (Encore), (Rescheduled), (Sold Out), (Preseason), …) and
   normalizes "vs.", "@", "v.s." → "vs". Category-agnostic.

2. **Post-extraction merge pass** (`mergeDuplicateEvents`) catches what
   survives the hash. Two cluster keys: same canonical \`ticket_url\` +
   \`start_date\`, OR same \`venue\` + \`start_date\` + \`start_time\`.
   For each cluster the row with the most non-null fields wins; losers
   donate their non-null fields then get deleted.

### Distance filter (universal)

Hide events estimated > 2 hours one-way drive from DC metro UNLESS
\`base_score ≥ 0.85\`. Applies to **every category** — sports away games,
NYC concerts, Charlottesville exhibits, Pittsburgh art shows, Rehoboth
beach weekends are all judged on the same rule. The 'away' category
isn't exempt; weekend-trip events still earn their slot via score.

Three-layer text-based heuristic in \`services/distance.js\`:

1. **Pro stadium names** — Guaranteed Rate Field, Citi Field, Fenway,
   Yankee Stadium, MetLife, Soldier Field, etc. Most specific.
2. **City/town tokens** — DC metro core (≤ 30 min) → distant cities
   (NYC / Philly / Pittsburgh / Boston, 240 min). Charlottesville,
   Gettysburg, Luray, Rehoboth all 150–180 min.
3. **Source-name fallback** — "Visit Charlottesville", "Destination
   Gettysburg", "Rehoboth Beach Events" carry distance signal even
   when the row's address fields are sparse.

Returns null if uncertain — null events default to "keep" (don't hide
on a guess). \`?showHidden=1\` on \`/api/events\` bypasses for admin
debugging and tags events with \`_distance_hidden\`, \`_distance_minutes\`,
\`_distance_reason\`.

V0 heuristic; future: replace with event_lat/event_lng + haversine
when those columns land.

### Source authority — data-driven

\`sources.source_tier\` (A/B/C/D) is now the source of truth for the
authority boost (+0.15 / +0.08 / 0 / −0.05). The regex-on-name classifier
is kept as a fallback for sources with NULL tier. Boot-time \`seedSourceTiers()\`
populates the column from the regex once, and applies hand-promotions
for editorial roundups whose name doesn't match: \`washington.org Monthly\`,
\`washington.org This Weekend\`, \`FXVA Fairfax Events\` → Tier B.

Admin can promote/demote without a code deploy via
\`POST /api/admin/sources/:id/tier\`.

### Other scoring tweaks

- **\`recencyMod\`** — never-shown bumped from +0.1 to +0.2 so it clearly
  outranks long-ago-shown (+0). Same fix on the evergreen recency path.
- **\`weatherModifier\`** — picks the forecast day matching the event's
  \`start_date\` (was always Saturday). Outdoor categories expanded to
  include \`family\` and \`wellness\` so Sunday 5Ks and kid park festivals
  read their own day's weather.
- **\`MAJOR_VENUE_KEYWORDS\`** audited against actual \`events.venue\`
  strings. Added: AFI Silver, Torpedo Factory, Politics and Prose, Pearl
  Street Warehouse, Capital One Hall, Library of Congress, Studio
  Theatre, Olney Theatre, Shakespeare Theatre, Jiffy Lube Live,
  Merriweather, Mosaic District. Removed entries that never matched.
- **Title+date dedup nullsafe** — null-date events no longer collapse
  via the synthetic \`"::nd"\` key. Two unrelated trivia nights at
  different breweries with null dates pass through untouched.
- **NULL-category heal** — \`siteParsers.js\` config now supports
  \`defaults.categories\`; pre-parsed events from single-purpose parsers
  (Smithsonian Associates seeded as \`['nerdy']\`) won't land with
  \`category=NULL\` anymore. Boot-time heal backfills existing NULL rows
  via a source-name → category map.

### Frontend: "Time on ticket"

\`formatWhen\` used to fall back to "Anytime" when no time signal was
extractable, even for events with a fixed time (concert, theater) the
extractor just couldn't parse. Now: when the event has both a
\`start_date\` AND a \`ticket_url\`, render "Time on ticket" — the user
can click the ticket button to see the actual time. Evergreens (no
start_date) keep "Anytime" since they really are open-ended.

### Admin dashboard

\`GET /api/admin-ui\` serves a single-page HTML viewer (no auth on the
page; prompts for the admin token, caches in sessionStorage). Source
health table with tier pills, lifetime / 14d / days-idle counts, status
pills, last-error text, inline reactivate + set-tier buttons. Top-row
summary stats. Feed-stats panel showing per-category counts, score
buckets, sample distance-hidden events with their estimated minutes.

JSON endpoints behind it (all token-gated):
- \`GET /api/admin/dashboard\` — per-source health
- \`GET /api/admin/feed-stats\` — feed-level diagnostics
- \`POST /api/admin/sources/:id/reactivate\` — manual unpause
- \`POST /api/admin/sources/:id/tier\` — set source_tier

### checkSourceHealth column reference

\`events.created_at\` doesn't exist (the column is \`extracted_at\`). The
zero-event advisory query in \`checkSourceHealth\` was throwing silently
inside the catch and never wrote the \`last_error\` flag. One-line fix.

---

## Changes 2026-04-25 (later session)

**Sports as time-bound events, not evergreens.** `Nationals game` / `Capitals + Wizards` / `DC United` were sitting in `evergreen_events` with vague "Check schedule" copy — they're not evergreen, they have specific dates. Deleted those rows. New `src/services/sports.js` pulls Nationals home games from MLB Stats API (`statsapi.mlb.com`), filters to `teamId=120` home games, skips postponed/cancelled, dedupes via `content_hash` (`md5(normalized title + start_date)`), and upserts into `events`. Wired into the nightly 3am cron via `syncAllSports()`. Capitals + DC United next on the same scaffold.

**User feedback collection.** New `user_feedback` table (id, body, category, profile_id, email, user_id, context jsonb, status, created_at). Backend exposes:
- `POST /api/feedback` — public, validates category against whitelist (bug/idea/data/praise/other), caps body at 4000 chars, validates `userId` shape with regex.
- `GET /admin/feedback` — admin, lists by status (default `new`).
- `POST /admin/feedback/:id/status` — admin, triage to `triaged`/`shipped`/`wont-fix`.

Frontend `SendFeedback.jsx` floating 💬 button (bottom-right, safe-area aware) opens a modal with category pills + free-text textarea. Mounted in `App.jsx` only when `screen !== 'ambient' && settings.onboardingDone`.

**PostEventFeedback "Didn't go" option.** 4th choice alongside Loved / Was OK / Meh. Mapped to `down` server-side via `feedbackMap` in `usePostEventFeedback.js` — could split later if we want to weight skip-signal differently from dislike. Mobile positioning fixed: `bottom: calc(env(safe-area-inset-bottom, 0px) + 16px)` so the toast doesn't tuck under iOS chrome; `flex: '1 1 80px'` on buttons so 4 options drop to 2x2 on narrow widths.

**Sunday banner** (`day === 0 && hr >= 17 || day === 1 && hr < 12`) → (`day === 0 && hr >= 15`). The Monday-morning case was firing while "this weekend" had already auto-shifted to upcoming Fri-Sun, telling users to "look at next weekend" while they were already looking at it. Sunday afternoon is the only time the banner adds signal.

**Per-column ErrorBoundary.** New `SingleColumnBoundary` class component wraps each `<CatColumn>` / `<StackedColumn>` in `ActiveMode.jsx`. One bad event now kills its column (with a small in-column retry button) instead of the entire feed. Outer `ColumnErrorBoundary` kept as a catch-all for layout-level crashes.

**Admin auth hardening.** `req.headers !== secret` was vulnerable to timing attacks (early-return on first byte mismatch). Replaced with `crypto.timingSafeEqual` + per-IP failure tracker (`Map` keyed by `req.ip`, 10 attempts/hour, 1-hour rolling window, 429 response on lockout). Successful requests don't count against the limit. See top of `src/routes/api.js`.

**Performance**:
- `CatColumn` filter chain (`dedupeActivities` + 4 `.filter()` calls) is now `useMemo`'d on `[activities, cat.id, removed, timeFilters, priceFilters]`. Without it, every column re-ran the chain on any sibling's keystroke.
- `useWeekdayActivities(city, profile, enabled)` — added `enabled` param; only fetches when `screen === 'weekday'`. Most sessions are weekend-only, so this saves a 60-event payload per visit.

**ESLint TDZ rule.** `eslint.config.js` adds `no-use-before-define` with `variables: true, functions: false, classes: true`. Catches the temporal-dead-zone footgun where a `useEffect` dep array references a `const` declared further down in the same component (throws ReferenceError → blank screen). We hit this twice; now lint-blocked. Fixed one existing violation in `App.jsx` (`transitionTo` declared after `resetIdleTimer` referenced it).

**Auth path console.log strip.** Wrapped the OAuth token-storage log in `if (process.env.NODE_ENV !== 'production')` so we don't spew profile IDs in Render logs.

---

## Current State — May 2026

A round of user testing against ~5 beta users surfaced five trust-killers; the next two weeks of work was almost entirely about fixing those. This section documents the resulting product state.

### Five trust-killers and their fixes

| Issue | Fix |
|---|---|
| Heavy Google data ask on first login (`/auth/calendar` full scope = "see, edit, share, and **permanently delete** all calendars") | Narrowed to `/auth/calendar.events` — same write-event capability, dramatically less alarming consent screen |
| Empty / thin category columns | Drop empty columns entirely. Thin columns (1–2 events) merge into a synthetic "Other" bucket. Final ordering: Curated → populated → Other. No zero-count tail. |
| Links that go to Google instead of the actual event | Frontend killed the `btnI=1` "I'm Feeling Lucky" fallback. The Open button only renders when there's a real URL. |
| Wrong data ("Best of the Apollo" tagged at "Nationals Park") | Extractor prompt got rule 4f (sports home/away) + rule 0 ("CARDINAL RULE — NO CROSSED WIRES: every field for one event must come from the same paragraph"). Plus per-site HTML parsers replace Haiku entirely for ~80 sources, eliminating the cross-mixing failure mode. |
| Duplicate events (5× "Georgetown French Market", 4× "DC Chocolate Festival") | `content_hash` now hashes title+date only (was title+venue+date — venue varied across sources, so dedup missed). UPSERT smart-merges venue/url/desc from whichever source had the most complete row. |

### Categories — now 21 (was 14)

`outdoors`, `food`, `restaurants`, `arts`, `theater`, `books`, `music`, `sports`, `nerdy`, `drinks`, `nightlife`, `comedy`, `film`, `wellness`, `family`, `activities`, `shopping`, `away`, `trips` — plus two synthetic columns:

- **`curated`** — top 8 events across all categories by base_score, deduped, sponsored excluded. First card gets the **Spotlight** strip (violet, expanded by default). Always renders first.
- **`other`** — thin-category overflow bucket. Events with category counts <3 get pulled out and rolled into `other` with their source category preserved (rendered as emoji prefix). Always second-to-last.

### View modes

Toggle in the QuickPrompts row, persists in localStorage:

- **Compact** — every card collapsed; tighter spacing
- **Standard** — Spotlight expanded, rest collapsed (default)
- **Magazine** — every card expanded; more breathing room

### Sponsored events

New `events.is_sponsored boolean` column. 8 self-serving seeds in the DB (poker at Adam's, Target with Kailee, etc.). Render treatment:

- **Card:** amber inline strip at top reading `⚡ SPONSORED`
- **Desktop:** sponsored hero takes precedence over Top Pick in the WeekendSidebar
- **Mobile:** spliced into the Curated column at slot #2 (right after Spotlight) — no sidebar on mobile

### Action bar — consolidated

Old: 8 buttons (📅 📍 🍽 🎟 🔗 ↗ ❤️ 👍 👎). New:

- 📅 Add to calendar
- 📍 Directions
- **Smart Open** — picks the best link automatically: Reserve (Resy/OpenTable) → Tickets (specific URL) → Open page (event page) → hidden (no Google fallback)
- ↗ Share
- 👍 / 👎 feedback

The heart Save button is gone — thumbs-up + calendar-add cover both signals.

### Top-bar menu (replaces Settings → About Locale)

A small ⓘ button in the header opens a popover with the 7 boilerplate pages (About, Business, Advertise, Terms, Privacy, Trust, Support). Settings stays focused on actual settings.

### Source transparency — behind an infotip

The "From Washingtonian · ✓ confirmed" footer that appeared on every expanded card is now collapsed behind a tiny ⓘ at the bottom-right of the card. Click reveals.

### Loading splash — split rows

Progress lines (1.4s rotation) and tips (5s rotation) are now separate rows. Old version mixed them at 2.2s, which was too fast to read tips and too slow for momentum. Now: progress churns above, tip dwells below in its own card.

### Friend-going pill

When `act.friends_interested.length > 0`, the compact card shows a small amber pill in the title row reading `👥 3 going` with stacked avatars. Replaces the bare avatar stack.

### View-mode default behavior in cards

ActCard now reads `viewMode` prop and sets initial `expanded` state accordingly:
- `magazine`: every card opens expanded
- `standard`: only Spotlight opens expanded (current behavior)
- `compact`: every card opens collapsed

### Three-tier venue / area system (data quality)

After multiple iterations on what to do when a source returns null venue:

- **Tier 1 — single venue:** Source/host = one specific physical place. `Pinstripes DC Bocce`, `Birchmere Alexandria`, `Kennedy Center`, `Ford's Theatre`, `9:30 Club`, etc. → fill venue with that name.
- **Tier 2 — small navigable area:** Source/host = a small walkable district (~2 sq mi or one mixed-use complex). `Falls Church City Calendar`, `Mosaic District Events`, `Downtown Silver Spring`, `CityCenterDC`, `Old Town Alexandria`, `National Mall`, `Smithsonian Associates` (programs cluster on the Mall) → fill BOTH venue AND neighborhood with the area name. Frontend's `formatVenue()` prefers neighborhood; relevancy uses neighborhood for proximity scoring.
- **Tier 3 — sprawling aggregator:** Smithsonian umbrella (museums miles apart), NoVA Parks (30+ parks), Loudoun Wineries (40+ over 500 sq mi), Ocean City MD (5-mile boardwalk), Eventbrite NoVA, FXVA Fairfax, Visit Charlottesville, washington.org, washingtonian.com, MLB/NFL schedules (home/away ambiguity) → leave both fields null. Each event is at a different real venue; `web_search` backfill resolves per-event.

`AGGREGATOR_HOSTS` set + `isAggregatorHost()` guard prevents these from leaking via the title-host slug-match heuristic.

### Authentication scope (Google OAuth)

- **App scope:** `openid email profile https://www.googleapis.com/auth/calendar.events`
- **Pending:** custom OAuth client in our own Google Cloud project so the consent screen says "Sign in to Locale" instead of `<supabase-ref>.supabase.co`. Code path is correct; this is config-only.

### Beta info

Single inbox during beta is `adamcrubin@gmail.com`. Onboarding flow + Welcome screen exist; demo mode is gated (LoginPromptModal blocks writes for unauthenticated users).

