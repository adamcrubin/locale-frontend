# Locale Data Pipeline — Technical Reference

> **As of April 2026.** Covers the full scrape → extract → score → display cycle for the Locale weekend activity app.

---

## Stack

| Layer | Technology | Host |
|---|---|---|
| Backend | Node.js / Express (ESM) | Render.com free tier |
| Database | Supabase Postgres | Supabase |
| Frontend | React 19 + Vite | Netlify |
| AI — extraction | Claude Haiku (`claude-haiku-4-5-20251001`) | Anthropic API |
| AI — prompts, ask, activities | Claude Sonnet (`claude-sonnet-4-6`) | Anthropic API |
| AI — web search | Haiku with `web_search_20250305` tool | Anthropic API |

**Render free tier note:** The backend spins down after 15 minutes of inactivity. Cold starts take 30–60 seconds. The frontend's localStorage cache (5-minute TTL, stale-while-revalidate) absorbs this — users see cached data instantly while the server wakes.

---

## Pipeline Overview

```
sources (DB table)
     │
     ▼
[1] scraper.js          ← triggered by POST /api/admin/refresh/sources
     │                     or on schedule via refresh.js (daily 5am cron)
     │  direct HTTP scrape   OR   web search (Haiku + web_search tool)
     │  parallel batches of 8 sources
     ▼
scraped_content (DB table, expires in 25h)
     │
     ▼
[2] extractor.js        ← triggered by POST /api/admin/extract
     │                     or automatically after scraping (refreshActivities)
     │  Haiku extracts structured events from raw text (8000 char window)
     ▼
events (DB table)
     │
     ▼
[3] relevancy.js        ← called per request by GET /api/events
     │  scoring: base_score × preference modifier × weather modifier
     │           + recency modifier + expiry boost
     │  URL-based dedup, category grouping, why-blurb generation
     ▼
{ [category]: { events[], evergreens[], pinned_rec, total } }
     │
     ▼
[4] useActivities.js    ← React hook in frontend
     │  localStorage cache (5min TTL), stale-while-revalidate
     │  transformFeed() → flat Activity arrays per category
     ▼
ActiveMode.jsx card columns
```

---

## Stage 1: Scraping (`src/services/scraper.js`)

### Trigger

- **Manual:** `POST /api/admin/refresh/sources` → calls `refreshSources(zip)` → calls `scrapeSourcesForZip(zip)`
- **Scheduled:** `refresh.js` cron at 5am daily → `refreshActivities(zip)` → skips scrape if content is fresh (≥5 sources scraped within 6 hours)

### Source loading

```sql
SELECT * FROM sources WHERE zip_code = $1 AND active = true AND type IN ('scrape', 'pattern')
```

Currently ~75 sources for zip `22046` (Falls Church, VA).

### Weekend date range calculation

Computed at scrape time. The scraper calculates the upcoming Friday–Sunday window (or the current weekend if today is Fri/Sat/Sun) and passes it as `{ friStr, sunStr }` to the web search query builder.

**Date formatting for search queries:** YYYY-MM-DD strings are parsed directly (no `new Date()`) to avoid UTC/local timezone off-by-one errors on the server. Month names are derived from a static lookup: `MONTHS[fm-1]`.

### Parallel batch scraping

Sources are processed in **batches of 8** concurrently using `Promise.all`. A 300ms pause runs between batches. This reduces total scrape time from ~10 minutes (serial) to ~2 minutes (parallel). No rate-limiting concern since each source hits a different domain.

### Two scrape strategies

#### Strategy A — Direct HTTP scrape (default for most sources)

1. `axios.get(url)` with browser-like headers, 12-second timeout, max 3 redirects
2. `htmlToText(html, sourceUrl)` pipeline:
   - Strips `<script>`, `<style>`, `<nav>`, `<footer>` blocks entirely
   - Strips `<header>` elements **only** if they match site-navigation patterns (class/id containing `site`, `global`, `page`, `main-header`, `top-bar`, `masthead`, or `role="banner"`). Generic `<header>` elements inside article content are preserved — they often contain event title, date, and venue.
   - Before stripping `<a>` tags, injects `[URL:https://...]` markers in-place — this lets Haiku see and extract event page links from href attributes
   - Resolves relative URLs to absolute using the source URL as base
   - Skips `javascript:`, `mailto:`, and hrefs shorter than 10 characters
   - Decodes HTML entities (`&amp;`, `&lt;`, `&gt;`, `&nbsp;`)
   - Collapses whitespace, trims, caps at **8,000 characters**

#### Strategy B — Web search via Haiku (for JS-rendered / blocked sites)

Used as **primary** method for blocked sites; as **fallback** when direct scrape fails.

Each source has a pre-authored targeted query in `getWebSearchQuery()`, e.g.:
```
"9:30 Club Shows" → "9:30 club DC concerts shows Apr 25–27 2026"
"FXVA Fairfax Events" → "fairfax county virginia events things to do Apr 25–27 2026 festivals outdoor"
```

Haiku is called with the `web_search_20250305` tool (`max_tokens: 4000`) and instructed to return only raw event listing data (name, date, location, price, URL). Response is capped at 8,000 characters.

### Blocked sites routing

Two lists control routing — sources matching either are sent straight to web search:

**`BLOCKED_SITES`** (matched by source `name`):
- Washington Post Going Out Guide, Washington Post Weekend
- Ticketmaster DC This Weekend
- Axios DC Events
- Northern Virginia Magazine Events
- FXVA Fairfax Events
- DC United Schedule, Washington Nationals Schedule
- AMC Tysons Corner Movies, Regal Ballston Quarter Movies
- Topgolf Sterling VA, Dave and Busters Springfield
- REI DC Outdoor Events

**`BLOCKED_URLS`** (matched by substring in source URL):
`washingtonpost.com`, `axios.com`, `ticketmaster.com`, `washington.org`, `northernvirginiamag.com`, `fxva.com`, `dcunited.com`, `mlb.com`, `amctheatres.com`, `regmovies.com`, `topgolf.com`, `daveandbusters.com`, `rei.com`

### Pattern sources

Sources with `type = 'pattern'` have dynamic URLs (e.g. weekly roundup articles). Before scraping, `resolvePatternUrl(source)` runs the source-specific resolver from `PATTERN_RESOLVERS`:

| Source | Strategy |
|---|---|
| Washington Post Going Out Guide / Weekend | Fetches hub page, extracts links matching `best-things-to-do`, `best-events`, `weekend` — *note: these sources are also in BLOCKED_SITES so the resolver runs only if web search fails* |
| Washingtonian Weekly | Fetches `/things-to-do/`, extracts and date-sorts story links |
| Washington Times Events | Fetches `/events/`, extracts and date-sorts story links |
| DCist Weekend Events | Tries `/things-to-do/` and `/topic/weekend-events/`, filters for 2026 `/story/` links |
| 51st News DC Events | Tries category/tag/home pages, returns first URL with matching content |
| Northern Virginia Magazine Events | Fetches `/things-to-do/`, date-sorts `weekend-events` links — *also in BLOCKED_SITES* |

If a resolver fails, the source's base URL is used as fallback.

### Storage

Successful scrapes are written to `scraped_content`:
```sql
INSERT INTO scraped_content (source_id, raw_text, scraped_at, success, expires_at)
VALUES ($1, $2, NOW(), true, NOW() + INTERVAL '25 hours')
```

Sources are also updated: `last_checked`, `last_ok`, and `last_error` fields.

### Source health check

`checkSourceHealth()` (called monthly by cron) runs two checks per source:

1. **URL reachability** — `axios.head(url)`. Two consecutive failures → `active = false`.
2. **Event production** (advisory) — checks if the source produced ≥1 event in the last 14 days. Zero-event sources are flagged with `last_error = 'No events extracted in 14 days'` but not deactivated. This surfaces sources that pass URL checks but aren't producing content (JS-rendered sites that slipped past BLOCKED_SITES, broken parsers, etc.).

### Pipeline status

`setScraping(true)` is called at the start; `setScraping(false, successCount)` at the end. This updates the in-memory `pipelineStatus.js` singleton.

---

## Stage 2: Extraction (`src/services/extractor.js`)

### Trigger

- **Manual:** `POST /api/admin/extract`
- **Automatic:** called by `refreshActivities()` after scraping completes

### Source selection

Picks the most recent scraped content per source that is still fresh and not expired:
```sql
SELECT DISTINCT ON (sc.source_id)
  sc.source_id, sc.raw_text, sc.scraped_at, s.name
FROM scraped_content sc
JOIN sources s ON s.id = sc.source_id
WHERE s.zip_code = $1
  AND sc.success = true
  AND sc.expires_at > NOW()
  AND sc.scraped_at > NOW() - INTERVAL '25 hours'
ORDER BY sc.source_id, sc.scraped_at DESC
```

### Haiku extraction prompt

Model: `claude-haiku-4-5-20251001`, `max_tokens: 8000`

Source text fed to Haiku: `rawText.slice(0, 8000)`

Key extraction rules sent to Haiku:
1. Only extract events explicitly mentioned in the text — never invent
2. Include events starting Fri–Sun, multi-day events running through the weekend, and undated evergreen options
3. Skip events ending before Friday or starting after Sunday
4. Skip: support groups, virtual events, certification courses, AA meetings, HOA meetings, religious services, civic meetings, therapy sessions, timeshares, medical procedures
5. Descriptions: 15–25 words, specific and vivid, no title/venue repetition
6. `[URL:...]` markers in the text are href values — extract them as `url` / `ticket_url`
7. `ticket_url` only for URLs containing ticketmaster, eventbrite, tix.com, or `/tickets`, `/buy`, `/register` in path
8. Cost: exact price strings only (`"$15"`, `"Free"`) — never `"See details"`, `"Varies"`, etc. If unclear: `null`
9. Categories: 1–3 from the 14-category list — never leave empty, never use `"miss"`
10. Dedup: if same event appears multiple times, extract once
11. `when_display`: short format like `"Sat 8PM"` or `"Fri–Sun"`. **If day/time is unknown, use `"This weekend"` — never null**
12. Day-from-heading: infer day from section headers ("Friday", "Saturday", "Sunday") if no explicit date per event
13. **Time-from-context:** if a time (`"8PM"`, `"7:30pm"`, `"doors at 7"`, `"noon"`) appears on the same line or within 2 lines of an event title, capture it as `start_time`
14. Music events: include genre in `tags[]` (`"jazz"`, `"classical"`, etc.)
15. Spectator sports: add `"spectator"` tag

Returns a JSON array. `extractJSON()` handles all markdown fence variants and falls back to regex extraction.

### Post-extraction filtering

**BLOCKLIST** — events skipped if title or description contains any of (kept in sync with frontend `FRONTEND_BLOCKLIST`):
`support group`, `surgery support`, `rotator cuff`, `online healing`, `virtual event`, `webinar`, `zoom meeting`, `online only`, `online session`, `certification course`, `ceu credits`, `continuing education`, `hoa meeting`, `civic federation`, `homeowners association`, `aa meeting`, `na meeting`, `anonymous meeting`, `recovery meeting`, `therapy session`, `counseling session`, `mental health workshop`, `timeshare`, `real estate seminar`, `investment seminar`, `wound care`, `shoulder surgery`, `insurance seminar`, `civic meeting`, `neighborhood meeting`, `town hall meeting`, `religious service`, `church service`, `bible study`

**JUNK_COSTS** — `cost_display` set to null if it contains:
`see details`, `check website`, `varies`, `tbd`, `register`, `visit website`, `zoo admission`, `general admission`, `tickets required`, `price varies`, `contact organizer`, `check eventbrite`, `more info`, `see website`, `ticket required`, `admission`, `check schedule`

**`cleanCostDisplay()`** also strips coupon codes, percentage-off text, and multi-tier pricing to extract a clean `$N` or `$N–$M` string.

### Content deduplication (MD5 hash)

```js
contentHash = MD5(
  normalize(title).slice(0, 60)  // lowercase, strip punctuation, collapse whitespace
  + '::'
  + normalize(venue).slice(0, 30)
  + '::'
  + (start_date || '')
).slice(0, 16)
```

On insert conflict:
```sql
ON CONFLICT (content_hash) DO UPDATE SET
  confidence = CASE WHEN EXCLUDED.confidence='confirmed' THEN 'confirmed' ELSE events.confidence END,
  base_score = GREATEST(events.base_score, EXCLUDED.base_score),
  ticket_url = COALESCE(EXCLUDED.ticket_url, events.ticket_url),
  updated_at = NOW()
```

### Base score calculation

`base_score` (0.5–1.0) from `calculateBaseScore()`:

| Condition | Bonus |
|---|---|
| Base | +0.50 |
| `confidence = 'confirmed'` | +0.10 |
| `cost_display = 'Free'` | +0.05 |
| `venue` present | +0.05 |
| `start_date` present | +0.05 |
| `start_time` present | +0.03 |
| `url` present | +0.02 |

### Event expiry

```js
expiresAt = evt.end_date
  ? new Date(evt.end_date + 'T23:59:59')
  : new Date(dateRange.sunStr + 'T23:59:59')
```

At the end of each extraction pass, past events are expired:
```sql
UPDATE events SET active=false WHERE zip_code=$1 AND expires_at < NOW() AND active=true
```

### Pipeline status

`setExtracting(true/false, count)` bookends the pass.

---

## Stage 2b: Scraped Context for AI Prompts (`getScrapedContext`)

When `claude.js` generates activity suggestions or prompt responses (Plan my Saturday, Date night, etc.), it calls `getScrapedContext(zip)` to build a combined text window from all scraped sources.

**Priority order:** The 7 "roundup" sources (WaPo, Washingtonian, DCist, Northern Virginia Magazine, 51st News, Washington Times) are placed first — they consistently yield the most event-dense content.

**Per-source slice:** Up to **5,000 characters** per source.

**Context ceiling passed to Sonnet:** **40,000 characters** (covers ~8 fully-loaded sources). Previously this was 6,000, which meant Sonnet only saw ~1–2 sources worth of content regardless of how many were scraped.

**Ask Claude context:** 1,500 characters (free-text questions need less — just enough for grounding).

---

## Stage 3: Relevancy Scoring (`src/services/relevancy.js`)

### Entry point

`getEventFeed(zipCode, profileId, weather, options)` — called by `GET /api/events`.

### Event query

Fetches active, non-expired events for the weekend window, joined to `profile_events` for per-user recency/feedback data:

```sql
SELECT e.*, pe.last_shown, pe.show_count, pe.feedback, pe.score_modifier, ...
FROM events e
LEFT JOIN profile_events pe ON pe.event_id = e.id AND pe.profile_id = $2
WHERE e.zip_code = $1
  AND e.active = true
  AND (e.expires_at IS NULL OR e.expires_at > $3)
  AND (
    e.start_date IS NULL
    OR (e.start_date::date >= 'YYYY-MM-DD' AND e.start_date::date <= 'YYYY-MM-DD')
    OR (e.end_date IS NOT NULL AND e.start_date::date <= sun AND e.end_date::date >= fri)
  )
  AND (pe.feedback != 'dismissed' OR pe.feedback IS NULL)
```

### Score modifiers

Final score = `base_score + profile_modifier + recency_mod + expiry_mod + weather_mod + preference_mod`

**Recency modifier** (from `profile_events.last_shown`):
- Never shown: `+0.1`
- Shown >14 days ago: `0.0`
- Shown 7–14 days ago: `−0.3`
- Shown <7 days ago: `−0.8`

**Expiry modifier:** `+0.2` if event expires within 3 days (creates urgency)

**Weather modifier** (for `outdoors`, `away`, `trips` categories):
- Saturday precip >50%: `−0.35`
- Saturday hi >68°F and precip <20%: `+0.15`
- Otherwise: `0`

**Preference modifier:**
- Each user pref (e.g. `"jazz"`, `"hiking"`) that overlaps with event tags/categories: `+0.08`
- Capped at `+0.25` (3+ matching prefs)

**Profile modifier:** stored `score_modifier` from previous feedback interactions (`up: +0.3`, `saved: +0.4`, `down: −0.5`, `dismissed: −0.2`)

### URL-based deduplication

Before grouping, the highest-scored event per unique non-null URL is kept; lower-scoring duplicates (same event scraped from multiple sources) are dropped.

### Category grouping

Events are grouped into 14 categories. For the top 3 events per category, Haiku generates a personalized "why you should go" blurb (`getWhyBlurb()`) — cached in memory for 24 hours per event+profile pair. Events 4+ use the stored `description` as the `why` field.

### Evergreen events

`getScoredRecommendations()` queries `evergreen_events` (always-available venues, parks, museums — not time-bound). These are scored by `times_saved`, `times_shown`, recency, weather, and preference. Returned alongside events in each category's `evergreens[]` slot; the top evergreen becomes `pinned_rec`.

### Response shape

```json
{
  "outdoors": {
    "events": [...],
    "evergreens": [...],
    "pinned_rec": { ... },
    "total": 12
  },
  "food": { ... },
  ...
}
```

---

## Stage 4: Frontend Display

### `useActivities.js` (hook)

**Cache strategy:**
- On mount: reads `localStorage` key `locale_feed_{zip}_{profileId}`
- If cache hit and <5 minutes old: renders cached data immediately, then re-fetches in background after 3 seconds
- If cache miss: fetches live from API, shows mock `ACTIVITIES` data in the meantime
- `source` state: `'mock'` → `'cached'` → `'live'`

**`transformFeed(feed)`:**
Maps backend shape to flat `Activity[]` arrays per category:
- `events[]` → mapped with `when`, `where`, `cost`, `why` fields from backend columns
- `evergreens[]` → mapped similarly; uses `source_url || url`, `when_pattern`, `cost_range`
- `pinned_rec` → appended to evergreens with `is_pinned: true`
- All merged: `[...events, ...evergreens]` per category (backend pre-sorts by `final_score`)

**Card subheader format:** `[formatWhen] · [formatVenue] · [formatCost]`

**`formatWhen()` logic:** Uses `when_display` if present; falls back to `start_date` + `start_time` heuristics. The `isRestaurant()` heuristic suppresses time display for restaurant-type listings (checks `start_date` presence first — if no date, it's likely evergreen/venue).

### `ActiveMode.jsx` error boundary

A `ColumnErrorBoundary` class component wraps the entire main content area (columns + mobile layout). If any column render throws (e.g. prop drilling error, bad data), the boundary catches it and shows a recovery UI instead of a blank screen. Before this, any render error in a column would unmount the entire app.

### `usePipelineStatus.js`

Polls `GET /api/pipeline-status` every **8 seconds**. Shows an amber pulsing indicator in the UI while `scraping` or `extracting` is true.

---

## Cron Schedule (`src/jobs/refresh.js`)

| Job | Schedule | What it does |
|---|---|---|
| Weather refresh | Every 3 hours | Clears weather cache, re-fetches |
| Scrape + extract | Daily at 5am | Skips scrape if ≥5 sources fresh within 6h; always runs extraction |
| Evergreen verification | Every Monday 4am | `runVerificationPass(zip)` |
| Health check | 1st of each month at 3am | `checkSourceHealth` + `runAutoValidator` + `runVerificationPass` |
| **DB cleanup** | **Every Sunday at 2am** | Deletes expired `scraped_content`, `generated_activities`, and inactive `events` older than 30 days |
| On startup | After 3s / 5s delay | Weather + full activity refresh |

**Freshness check:** If ≥5 sources in `scraped_content` were successfully scraped within the last 6 hours, the scrape step is skipped. Extraction still runs (idempotent — ON CONFLICT handles re-runs safely).

---

## Database Tables

### `sources`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `name` | text | Friendly display name |
| `url` | text | Base or hub URL |
| `type` | text | `'scrape'` or `'pattern'` |
| `source_type` | text | `editorial`, `venue`, `government`, `aggregator`, `neighborhood` |
| `category_hint` | text | Primary category this source covers |
| `zip_code` | text | Target zip (e.g. `'22046'`) |
| `active` | boolean | Inactive sources are skipped |
| `last_ok` | timestamptz | Last successful scrape |
| `last_error` | text | Most recent error message (includes advisory "No events extracted in 14 days") |
| `last_checked` | timestamptz | Last attempt (success or fail) |

### `scraped_content`

| Column | Type | Notes |
|---|---|---|
| `source_id` | uuid | FK → sources |
| `raw_text` | text | Cleaned text (up to 8,000 chars) with `[URL:...]` markers |
| `scraped_at` | timestamptz | |
| `success` | boolean | |
| `expires_at` | timestamptz | `scraped_at + 25 hours`. Rows older than 7 days are hard-deleted weekly. |

### `events`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `content_hash` | text | 16-char MD5, unique constraint |
| `zip_code` | text | |
| `source_id` | uuid | FK → sources |
| `source_name` | text | Denormalized for display |
| `title` | text | |
| `venue` | text | |
| `address` | text | |
| `neighborhood` | text | |
| `start_date` | date | |
| `end_date` | date | |
| `start_time` | text | |
| `end_time` | text | |
| `when_display` | text | Short format: `"Sat 8PM"`, `"Fri–Sun"`, `"This weekend"` (never null) |
| `cost_display` | text | Cleaned: `"$15"`, `"Free"`, `"$10–$40"` |
| `cost_cents_min` | integer | |
| `cost_cents_max` | integer | |
| `categories` | text[] | 1–3 from the 14 valid categories |
| `tags` | text[] | Genre tags, `"spectator"`, etc. |
| `description` | text | 15–25 word vivid description |
| `url` | text | Event info page |
| `ticket_url` | text | Ticketing page (Ticketmaster, Eventbrite, etc.) |
| `confidence` | text | `'confirmed'` or `'inferred'` |
| `base_score` | float | 0.5–1.0 |
| `active` | boolean | Set to false when expired. Hard-deleted after 30 days via weekly cleanup. |
| `expires_at` | timestamptz | end_date or weekend Sunday |
| `raw_snippet` | text | First 500 chars of source text (for debugging) |
| `updated_at` | timestamptz | |
| `created_at` | timestamptz | |

### `google_tokens`

| Column | Notes |
|---|---|
| `user_id` | Falls back to `profile_id` when OAuth user is anonymous |
| `profile_id` | |
| `access_token` | |
| `refresh_token` | |
| `email` | |
| `expiry` | |

### `profile_events`

Tracks per-user event interactions: `last_shown`, `show_count`, `feedback` (`up/down/dismissed/saved`), `score_modifier`.

### `evergreen_events`

Always-available venues/parks/museums. Not time-bound. Scored by `times_saved`, `times_shown`.

### `generated_activities`

Caches Sonnet-generated activity lists and prompt responses. Keyed by `(zip_code, profile_hash, content_hash, weekend_str)`. Rows older than 7 days are hard-deleted weekly.

---

## Admin API Endpoints

All routes are under `/api/`:

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/refresh/sources` | Trigger scrape for a zip (`{ zip }`) |
| `POST` | `/admin/extract` | Trigger extraction pass (`{ zip }`) |
| `POST` | `/admin/refresh/activities` | Trigger full scrape+extract (`{ zip, force }`) |
| `POST` | `/admin/sources/add` | Add a new source (`{ name, url, source_type, category_hint, needs_pattern, zip_code }`) |
| `POST` | `/admin/sources/classify` | Haiku classifies a URL (`{ url }`) → returns `{ name, source_type, category_hint, needs_pattern, notes }` |
| `POST` | `/admin/sources/test` | Scrape + extract a single source, return debug info (`{ sourceId, zip }`) |
| `PATCH` | `/admin/events/:id` | Patch event fields (`start_time`, `url`, `cost_display`, `address`, `neighborhood`, `venue`, `description`, `categories`, `tags`, `confidence`, etc.) |
| `GET` | `/admin/sources/event-counts` | Events per source for active weekend (`?zip=`) |
| `GET` | `/admin/sources/status` | All sources with last_ok / last_error status |
| `POST` | `/admin/sources/:id/toggle` | Toggle source active/inactive |
| `POST` | `/admin/debug/links` | Full debug chain: raw text → URL markers → Haiku response (`{ zip, sourceName }`) |
| `POST` | `/admin/extract/debug` | Run extraction on most recent scraped source, return full result |
| `GET` | `/admin/scraped` | List scraped content with char counts and previews |
| `GET` | `/admin/events` | List events sorted by score |
| `POST` | `/admin/clear-events` | Wipe all events and scraped_content (for full rebuild) |
| `POST` | `/admin/verify` | Run evergreen verification pass |
| `POST` | `/admin/validate-urls` | Run URL auto-validator |
| `POST` | `/admin/health-check` | Run monthly health check |
| `GET` | `/admin/cache` | List in-memory cache keys |
| `POST` | `/admin/cache/clear` | Flush in-memory cache |
| `GET` | `/pipeline-status` | Current scraping/extracting booleans + timestamps |

---

## Pipeline Status Singleton (`src/services/pipelineStatus.js`)

In-memory object (resets on process restart — acceptable since Render fresh-starts on each deploy):

```js
{
  scraping:         false,
  extracting:       false,
  lastScrapeAt:     null,     // ISO string
  lastExtractAt:    null,
  lastScrapeCount:  0,        // sources processed
  lastExtractCount: 0,        // events inserted
}
```

Frontend polls `GET /api/pipeline-status` every 8 seconds and shows an amber pulsing dot while either boolean is true.

---

## Known Issues and Mitigations

| Issue | Mitigation |
|---|---|
| Render free tier cold starts (30–60s) | `useActivities` localStorage cache serves stale data immediately; 5-min TTL with stale-while-revalidate |
| JS-rendered sites (FXVA, Ticketmaster, AMC, Regal, DC United, MLB, etc.) | Routed to web search (Haiku + `web_search_20250305`) as primary method |
| WaPo / Axios paywalls | Routed to web search with `site:` targeted queries |
| Content hash collisions | Rare — can occur if venue name changes slightly. Manual PATCH via `/admin/events/:id` |
| `when_display` null | Extraction prompt now requires `"This weekend"` fallback — never null. Frontend `formatWhen()` also falls back to `start_date` + `start_time` heuristics. |
| Scraped content quality variance | Pattern sources (weekly roundups) are prioritized in `getScrapedContext()` — they consistently yield the most event-dense content |
| Stale sources (dead URLs) | Monthly `checkSourceHealth()` HEAD-checks all sources; two consecutive failures → `active = false`. Advisory event-production check flags zero-event sources. |
| Extractor junk costs | `cleanCostDisplay()` strips non-price strings; `JUNK_COSTS` list nullifies anything that slipped through |
| Duplicate events from multiple sources | `content_hash` dedup on insert (MD5 of normalized title + venue + date); URL dedup in `getEventFeed()` |
| DB growth (expired rows never deleted) | Weekly cleanup job (Sunday 2am) hard-deletes `scraped_content` and `generated_activities` older than 7 days, inactive events older than 30 days |
| Column render crash → blank screen | `ColumnErrorBoundary` in `ActiveMode.jsx` catches render errors and shows a recoverable error UI |

---

## Recent Pipeline Changes (2026-04-24)

**Weather source**
- `locale/src/services/weather.js` — daily `precip` and hourly `p` now read `probabilityOfPrecipitation.value` from the NWS `/gridpoints/.../forecast/hourly` payload. The old regex on `shortForecast` ("X percent") almost never matched at the hourly granularity, so precip chances were pinned to 0. Structured field is authoritative.

**Link-quality contract (frontend consumer side)**
The extractor still emits `url` and `ticket_url` as before, but the UI applies new validation:
- `ticket_url` is rendered only when it is event-specific. A bare aggregator domain (ticketmaster.com, livenation.com, stubhub.com, seatgeek.com, axs.com, eventbrite.com, resy.com, opentable.com) with no numeric path component is treated as non-specific and the button is hidden.
- Missing `url` falls back to Google `btnI=1` (I'm Feeling Lucky) with `-pinterest -facebook` filters rather than a plain search URL.
- **Pending extractor-side work**: reject bare aggregator domains at extraction time so relevancy/hash dedup see cleaner data; backfill `venue` from title/description regex when the model returns empty.

**Category model (frontend)**
- A virtual `curated` category is computed at render time in `App.jsx` from the top-10 scored events across all categories (dedup by normalized title). It is not persisted and has no storage implication; downstream pipeline stages are unchanged.

## Critical Pipeline/Backend Risks (NOT fixed — tracked in ROADMAP.md)

- **Admin endpoints are unauthenticated** (`src/api.js` admin routes) — pipeline triggers, source mutations, and deletes are reachable by anyone with the backend URL.
- **`profileId='default'` IDOR** in Google token storage (`src/services/google.js`) — any request can read/overwrite any profile's stored OAuth tokens. Blocks multi-user rollout.
- **No input validation layer** on write endpoints — consider zod or joi before widening write surface.

---

## Pipeline Changes 2026-04-25

**Extractor — cost reductions**

1. **Prompt caching**: `extractor.js` now sends messages as a content-block array. The static rules prefix (`STATIC_EXTRACTION_RULES`, ~1.5K tokens) is tagged `cache_control:{type:'ephemeral'}`. First call per ~5-min window pays full price; subsequent calls hit cache at ~10% of input cost.
2. **JSON-LD aware truncation**: `buildDynamicContext()` checks for the `=== STRUCTURED DATA ===` preamble the scraper prepends. When present, `rawText` is capped at 15K chars instead of 40K — structured data is already canonical, prose tail is redundant noise.
3. **max_tokens**: Dropped from 8000 to 3000. Typical extraction output is ~1.5K; caps worst-case cost.
4. **SDK upgrade**: `@anthropic-ai/sdk` `^0.20.0` → `^0.91.0`. Required for `cache_control` field serialization.

**Extractor — hash-skip re-extraction**

New columns on `sources` (added idempotently at startup via `db.js::ensureSchemaExtensions`):
- `last_extracted_hash TEXT` — md5 of raw_text from the last successful extraction
- `last_extracted_weekend DATE` — the Friday of the weekend that extraction was for

Logic in `extractEventsFromSource()`:
- Before Claude call: compute md5(rawText). If equals `last_extracted_hash` AND `last_extracted_weekend === current_fri_date`, return `{inserted:0, cached:true}` immediately.
- After successful extraction: `UPDATE sources SET last_extracted_hash = …, last_extracted_weekend = …`.

Weekend rollover invalidates the cache automatically (date mismatch). Static venue pages that change weekly but whose text is unchanged save the full Claude call.

**Extractor — auto-pause empty sources**

New column: `consecutive_empty_runs INT DEFAULT 0` + `auto_paused_at TIMESTAMPTZ`.

`recordExtractionYield()`:
- `inserted >= 1` → reset counter to 0.
- `inserted === 0` → increment counter. At 3, set `active = false`, `auto_paused_at = NOW()`, `last_error = 'auto-paused: 3 empty extraction runs in a row'`.

Existing admin dashboard surfaces `last_error` and `active=false` sources for reactivation.

**Extractor — source authority boost**

`calculateBaseScore(evt, sourceName)` now adds ±0.15 via `getSourceAuthorityBoost`. See DESIGN.md for tier list.

**Environment variables — no change.**
**Migrations — none required manually.** All ALTERs are `IF NOT EXISTS` and run from `testConnection()` at server start.

## Expected impact

- **Prompt caching**: ~40-60% input-token reduction on pipeline runs (depends on cache hit rate within the 5-min TTL; the parallel batch of 10 sources will almost always hit after the first).
- **JSON-LD truncation**: ~60% input reduction on venues with structured data (Ticketmaster, Eventbrite, Kennedy Center, etc.) — a meaningful share of long-tail sources.
- **Hash skip**: zero Claude calls for unchanged sources. On days with no weekend rollover and mostly-stable pages, this should dominate the savings.
- **max_tokens**: caps tail — limited savings since Anthropic only bills emitted tokens.
- **Auto-pause**: compounding over time — each quiet source removed is one fewer call per pipeline run forever.
