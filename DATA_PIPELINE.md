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

## Stage 1b: Direct API Sources (`src/services/sports.js`)

Some sources don't need scraping at all — they expose a structured API. Sports schedules are the cleanest example: dates, times, opponent, venue, all in JSON.

`sports.js` bypasses Stages 1–2 (scrape + Haiku extract) and writes directly to `events`:

| Source | API | Status |
|---|---|---|
| Washington Nationals home games | `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=120` (free, no auth) | Live |
| Washington Capitals | NHL public API | Coming next |
| DC United home games | MLS public API | Coming next |

**Flow** (`syncNationalsSchedule(daysAhead=30)`):
1. Fetch schedule from MLB Stats API.
2. Filter to home games (`teams.home.team.id === 120`); skip postponed/cancelled.
3. Build event row: title (`Nationals vs <opponent>`), `start_date` / `start_time` (ET), `venue: 'Nationals Park'`, `category: 'sports'`, `source: 'MLB Stats API'`.
4. Compute `content_hash = md5(normalized_title + start_date)` (matches extractor's dedup pattern).
5. Upsert with `ON CONFLICT (content_hash) DO UPDATE` so re-runs are idempotent.

**Triggers:**
- Manual: `POST /api/admin/sync-sports`
- Scheduled: nightly 3am cron (see Cron Schedule below) calls `syncAllSports()`

**Why not evergreen?** Sports games have specific dates and sell tickets per-game — they belong in `events`, not `evergreen_events`. Earlier "Nationals game" / "Capitals + Wizards" rows in `evergreen_events` with vague "Check schedule" copy were misleading; they were deleted in 2026-04-25.

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

### Auto-pause policy

A source is auto-paused (`active=false`, `auto_paused_at=NOW()`) when its
events table has gone idle for longer than a threshold scaled by its
lifetime track record:

| Lifetime events | Threshold |
|---|---|
| 0 – 5 | 14 days idle |
| 6 – 20 | 30 days idle |
| 21 + | 45 days idle |

Idle is measured as `MAX(extracted_at)` from the events table. Cache-skipped
runs (when raw_text hash matches the prior run) don't count, so a source
serving the same page for weeks doesn't accumulate pressure unfairly.

Brand-new sources with zero lifetime events skip the check entirely — they
get an implicit grace window from creation rather than pausing on a single
empty run.

`unpauseLegacyAutoPaused()` runs at boot and reactivates any source whose
`last_error` matches the old strike-counter format (`auto-paused: N empty
extraction runs in a row`). One-time cleanup against the prior policy.

### Cross-source dedup (Pass 3 after extraction + backfill)

The insert-time `content_hash` UPSERT collapses duplicates that share
title + start_date. Two more keys catch what survives:

1. **Canonical ticket_url + start_date** — same ticketing page = same event,
   regardless of how three different sources titled it.
2. **Venue + start_date + start_time** — same room at the same moment.

`mergeDuplicateEvents(zipCode)` runs after `backfillMissingFields`. For each
cluster, the row with the most non-null informative fields wins; losers
donate their non-null fields to the winner via UPDATE then get deleted.

Title hashing also strips a category-agnostic noise list before computing
the hash: `Throwback Night:`, `Premiere:`, `Featured:`, `Spotlight:`,
`Now Showing:`, `Opening Weekend:`, `Sponsored:`, `(Matinee)`, `(Encore)`,
`(Rescheduled)`, `(Sold Out)`, `(Preseason)`, `home match`, `at home`, etc.
"vs.", "@", "v.s." normalize to "vs".

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

### Stage 3b: Distance filter (`src/services/distance.js`)

Applied right after URL/title-date dedup, before per-category bucketing.
Universal across all categories.

**Rule:** hide events estimated > 120 minutes one-way drive from DC metro
unless `base_score ≥ 0.85`. Astronomical scores cross the bar (headliner
festivals, can't-miss regional draws); ordinary out-of-metro listings get
cut.

**Three-layer text-based heuristic** (returns null if uncertain → defaults
to keep):

1. **Stadium names** — Guaranteed Rate Field (Chicago, 600 min), Yankee
   Stadium (240), Citi Field (240), Fenway (480), Truist Park (Atlanta,
   600), MetLife (240), Lincoln Financial Field (180), Soldier Field
   (Chicago, 600), Heinz Field / Acrisure Stadium (Pittsburgh, 240), …
   Most-specific signal — beats stray city tokens elsewhere in the row.
2. **City / town names** — DC metro core (Falls Church, Arlington,
   Alexandria, McLean, Tysons, Bethesda, Silver Spring, Rockville: 20–30
   min), inner suburbs (Manassas, Leesburg, Frederick: 50–75 min),
   day-trip mid (Annapolis, Baltimore, Harpers Ferry, Front Royal: 90),
   long day trip (Charlottesville, Gettysburg, Luray, Rehoboth: 150–180),
   distant (NYC, Philly, Pittsburgh, Boston, Ocean City MD: 240+).
3. **Source-name fallback** — "Visit Charlottesville", "Destination
   Gettysburg", "Rehoboth Beach Events" carry distance signal even when
   the row's address fields are sparse.

**Admin bypass:** `?showHidden=1` on `/api/events` returns far-away events
in the response, tagged with `_distance_hidden`, `_distance_minutes`,
`_distance_reason`. Used by the admin dashboard "what's getting cut" panel.

V0 heuristic; future: replace with `event_lat` / `event_lng` columns +
haversine when those land.

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
| **Sports sync** | **Daily at 3am** | `syncAllSports()` — pulls schedules from MLB Stats API (Nationals home games); Capitals + DC United coming next |
| **Sponsored roll-forward** | **Every Monday at 3:30am** | Re-stamps sponsored seed events ("Poker night at Adam's", etc.) to the upcoming Fri/Sat/Sun. Without this they expire after the seeded weekend and never come back. |
| Evergreen verification | Every Monday 4am | `runVerificationPass(zip)` |
| Restaurant booking refresh | Every Monday 4:30am | Looks up direct booking URLs for restaurants in events + evergreens |
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
| `last_extracted_hash` | text | md5 of `raw_text` from the most recent extraction; used by hash-skip cache |
| `last_extracted_weekend` | date | Weekend Friday this source was last extracted for; combined with `last_extracted_hash` to short-circuit unchanged extractions |
| `consecutive_empty_runs` | int | Legacy counter (kept for admin dashboard back-compat); the live auto-pause policy uses days-since-last-event, not strikes |
| `auto_paused_at` | timestamptz | Set when source crossed the auto-pause threshold; cleared on `reactivate` |
| `source_tier` | text | `A` / `B` / `C` / `D`. Drives the +0.15 / +0.08 / 0 / −0.05 base_score boost. Admin-controllable via `POST /admin/sources/:id/tier`. |

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

### `user_feedback`

Free-text feedback drop from the floating 💬 button (`SendFeedback.jsx`).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `body` | text | User's text, capped 4000 chars at the API |
| `category` | text | Whitelist: `bug`, `idea`, `data`, `praise`, `other` |
| `profile_id` | text | Active profile id from the frontend, nullable |
| `email` | text | Supabase user email when signed in, nullable |
| `user_id` | uuid | Supabase user id (regex-validated UUID), nullable |
| `context` | jsonb | `{ url, ua, viewport, ts }` snapshot at submit |
| `status` | text | `new` (default) / `triaged` / `shipped` / `wont-fix` |
| `created_at` | timestamptz | |

---

## Admin API Endpoints

All routes are under `/api/`. All `/admin/*` routes require an `X-Admin-Token`
header matching `process.env.ADMIN_SECRET`; comparison uses
`crypto.timingSafeEqual` and per-IP failure rate-limiting (10 attempts/hr).

### Admin dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin-ui` | **Single-page HTML dashboard.** Unauth on the page; prompts for the admin token, caches in sessionStorage, sends `X-Admin-Token` on data fetches. Source health table (tier pills, lifetime / 14d / days-idle, status, last_error), inline reactivate + set-tier buttons, summary stats, feed-stats panel (per-category counts, score buckets, sample distance-hidden events). |
| `GET` | `/admin/dashboard` | JSON: per-source health for a zip. Returns each source with `source_tier`, `active`, `auto_paused_at`, `lifetime_events`, `events_last_14d`, `last_event_at`, `days_idle`, `last_error`. Plus a top-level `summary` rollup. |
| `GET` | `/admin/feed-stats` | JSON: feed-level diagnostics. `total_active`, `after_distance_filter`, `hidden_distance`, `by_category`, `score_buckets`, `hidden_examples` (8 sample distance-hidden events with `minutes` + `base_score`). |
| `POST` | `/admin/sources/:id/reactivate` | Manual unpause. Clears `auto_paused_at`, `last_error`, `consecutive_empty_runs`; sets `active=true`. |
| `POST` | `/admin/sources/:id/tier` | Body `{ tier: 'A' \| 'B' \| 'C' \| 'D' }`. Sets `source_tier` to drive the +0.15 / +0.08 / 0 / −0.05 base_score boost without a code deploy. |

### Pipeline + sources

| Method | Path | Description |
|---|---|---|
| `POST` | `/admin/refresh/sources` | Trigger scrape for a zip (`{ zip }`) |
| `POST` | `/admin/extract` | Trigger extraction pass (`{ zip }`) |
| `POST` | `/admin/refresh/activities` | Trigger full scrape+extract (`{ zip, force }`) |
| `POST` | `/admin/sync-sports` | Trigger MLB Nationals sync (Capitals/DC United TBD on the same scaffold) |
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
| `GET` | `/admin/feedback` | List user feedback (default `?status=new`) |
| `POST` | `/admin/feedback/:id/status` | Triage feedback to `new` / `triaged` / `shipped` / `wont-fix` |
| `GET` | `/pipeline-status` | Current scraping/extracting booleans + timestamps |

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/events` | Main feed. Query params: `zip`, `profileId`, `category?`, `weekday?`, `timeWindow?`, `limit?`, `offset?`, `userLat?`, `userLng?`, `userId?`, `showHidden=1?` (admin debug — returns far-away events tagged with `_distance_hidden`/`_distance_minutes`/`_distance_reason`). |
| `POST` | `/feedback` | Free-text feedback drop. Body `{ body, category, profileId?, email?, userId?, context? }`. Validates category against `bug \| idea \| data \| praise \| other`; caps body at 4000 chars. |

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

---

# Current pipeline — May 2026

This is the **authoritative** flow for now. The earlier sections of this doc describe the older Haiku-primary pipeline; they're kept for historical reference. When in doubt, this section wins.

## End-to-end flow

```
[1] sources (DB)
       │
       ▼
[2] scraper.js                     ← daily at 5am OR /admin/refresh/sources
       │  • directScrape: axios → raw HTML
       │  • try per-site HTML parser FIRST (services/siteParsers.js)
       │  • htmlToText() for the Haiku fallback path
       │  • web search via Haiku for blocked sites OR direct-scrape failures
       │  • apology detection drops bad web_search responses
       │
       ▼
[3] scraped_content (DB)            raw_text + parsed_events JSONB
       │
       ▼
[4] extractor.js                    ← /admin/extract OR auto after scrape
       │  IF parsed_events present  → use them, skip Haiku
       │  ELSE                       → Haiku extraction with prompt-cached static rules
       │
       │  THEN insert loop applies:
       │    • BLOCKLIST filter
       │    • Cost cleanup (junk strings → null)
       │    • Heuristic venue tier 1 (single-venue host/source map)
       │    • Heuristic venue tier 2 (small-area host/source map → fills venue + neighborhood)
       │    • Smart date inference (day-in-title → matching weekend day; else upcoming Sat + recurring=true)
       │    • Title-host slug match (festival domain = venue)
       │    • content_hash dedup (title+date only) + smart UPSERT merge
       │
       ▼
[5] events (DB)                    rough draft of the weekend's lineup
       │
       ▼
[6] backfill resolver              ← runs once at end of extraction pass
       │  • Find events missing url/venue/date/neighborhood/description
       │  • One Haiku web_search call per event returns JSON with whatever
       │    it could verify on real source pages
       │  • Sanitized fields written back to events
       │  • LAST resort: rows still missing ALL of (venue, date, url) get active=false
       │
       ▼
[7] events (final state)
       │
       ▼
[8] relevancy.js                   ← per request via /api/events
       │  scoring + dedup + category grouping + why-blurb (cached, global per event)
       ▼
[9] frontend
```

## Stage 1: Per-site HTML parsers (`src/services/siteParsers.js`)

The primary extraction path for ~80 of ~120 active sources. Parsers are pure functions — no Claude calls, no network, just regex. Run during scrape on the raw HTML before strip-tags.

### Architecture

| Layer | What it does |
|---|---|
| **Primitives** | 4 generic HTML matchers: `jsonLd`, `microdata`, `tribe`, `articleList` |
| **Custom parsers** | Escape hatches for sites that don't fit a primitive (Smithsonian Associates) |
| **`SOURCE_CONFIG`** | Per-source recipe: which primitives to run, in what order, plus quirk flags + defaults |
| **`DEFAULT_CONFIG`** | Fallback for any source not explicitly listed: try `jsonLd` then `microdata` |
| **Dispatcher** | `tryParseSite(name, html, url)` runs primitives in order, returns first non-empty result |

### The 4 primitives

| Primitive | What it catches | Best for |
|---|---|---|
| `jsonLd` | `<script type="application/ld+json">` schema.org/Event blocks | Modern theatre/music sites, Eventbrite, Tribe-on-WordPress |
| `microdata` | `itemtype="schema.org/Event"` blocks with `itemprop` fields | CivicPlus gov calendars, library sites |
| `tribe` | WordPress Tribe Events Calendar plugin (falls back to jsonLd, supplements with tooltip scrape) | ~10% of WP sites |
| `articleList` | Generic `<article>` / `<li class="event">` / `<div class="event-card">` with `<h2/h3>` + `<time>` | Editorial roundups (last resort) |

### Per-source quirk flags

| Flag | What it does | Used by |
|---|---|---|
| `defaults: { venue, neighborhood, address }` | Fills these fields when primitives leave them blank | Most single-venue sites (Birchmere, Kennedy Center, …) |
| `venueFromTitlePrefix: true` | Splits title on first colon → venue is the prefix. "Williams Sonoma: Art of Espresso" → venue = "Williams Sonoma" | Mosaic District (tenants in title) |
| `venueFromAdjacentDiv: { selector, innerSelector, lookback }` | After title is found, looks back `lookback` chars in the HTML for a sibling `<div class="...selector...">` containing a `<div class="...innerSelector...">VENUE</div>` | Falls Church City Calendar |
| `customFn: 'parseSmithsonian'` | Calls an entirely custom parser registered in `CUSTOM_PARSERS` | Smithsonian Associates (presentation-method extraction) |

### Dispatcher behavior

- Tries primitives in config order, first non-empty result wins
- Applies post-processing: title-prefix venue, adjacent-div venue, defaults
- Returns `null` if everything came up empty → existing Haiku flow runs as fallback (zero regression risk)

### Storage path

- Scraper persists per-site results to `scraped_content.parsed_events` JSONB column (migration: `add_scraped_content_parsed_events.sql`)
- Extractor's `runExtractionPass()` reads `parsed_events` alongside `raw_text`; passes to `extractEventsFromSource(..., { preParsedEvents })` which short-circuits the Haiku call

### Tests

`scripts/test-site-parsers.js` runs all 3 parsers (Mosaic, Falls Church, Smithsonian) against cached HTML samples and prints field-coverage stats. Run quarterly or after any HTML format change.

| Site | Events | Venue | Date | URL | Time |
|---|---|---|---|---|---|
| Mosaic District | 53 | 53/53 | 53/53 | 53/53 | 3 ms |
| Falls Church | 14 | 12/14 | 14/14 | 0/14 | 1 ms |
| Smithsonian Associates | 10 | 8/10 | 10/10 | 10/10 | 2 ms |

### Health check (`src/services/parserHealth.js`)

`POST /admin/parser-health` runs every parser against the most recent cached HTML and:

1. Logs per-source `events_count`, `primitive`, and 3 sample titles to a new `parser_health` table.
2. Compares to the prior run's count — if a source went from N>0 to 0, marks it as `regressed` (site changed its HTML).
3. Returns a structured report:
   ```json
   { "successes": 47, "failures": 33, "regressions": 2,
     "regressionList": [{ "name": "...", "lastCount": 14, "url": "..." }] }
   ```

Designed to run weekly via cron / GitHub Actions.

## Stage 2: Scraper changes

The scraper still has two strategies (direct HTTP scrape + web search Haiku) but now:

- **Tries the per-site parser FIRST** on raw HTML before strip-tags. If the parser succeeds, the events are stored to `scraped_content.parsed_events` and the Haiku extraction call is skipped downstream.
- **Apology detection strengthened** — drops web_search responses that start with "I appreciate your request, but I can't use site:..." or similar preambles. These were dumping unrelated events into the extractor and causing crossed-wires (e.g. "Best of the Apollo" tagged at "Nationals Park").
- **Structured hints preamble** — before strip-tags, `extractStructuredHints()` pulls `og:*` meta tags, microdata `itemprop="location"/"address"/"startDate"`, `<address>` blocks, and `<time datetime="...">` into a `=== STRUCTURED HINTS ===` block prepended to the cleaned text. Captures rich signal that strip-tags would otherwise nuke.

## Stage 3: Extractor changes

### Three-tier venue heuristic (runs BEFORE web_search backfill)

Cheap deterministic fills based on the source/host of each event:

- **Tier 1 — single venue** (`SOURCE_DEFAULT_VENUE` + `HOST_DEFAULT_VENUE`): e.g. `Birchmere Alexandria` → "The Birchmere", `kennedy-center.org` → "Kennedy Center". Fills `venue` only.
- **Tier 2 — small navigable area** (`SMALL_AREA_BY_SOURCE` + `SMALL_AREA_BY_HOST`): e.g. `Falls Church City Calendar` → both venue + neighborhood = "Falls Church"; `mosaicdistrict.com` → "Mosaic District". Fills BOTH `venue` AND `neighborhood`.
- **Tier 3 — aggregator** (`AGGREGATOR_HOSTS`): `smithsonianassociates.org`, `novaparks.com`, `mlb.com`, `eventbrite.com`, `washington.org`, etc. → leave both fields null. Each event is at a different real venue; backfill resolves per-event.

The `isAggregatorHost()` guard is also applied to the title-host slug-match heuristic ("DC Chocolate Festival" + `dcchocolatefestival.com` → venue=title) so aggregators don't leak via that path.

### Smart date inference

For events that come back without `start_date`:

- Day-of-week in title (`"Throwback Thursdays"`) → that day's weekend occurrence
- Otherwise → upcoming Saturday + `recurring=true` (so dedup collapses across weeks for evergreen-shaped events like "Bowling & Bocce")

### Dedup overhaul

- `content_hash` = MD5(normalized_title + "::" + start_date_or_recurring) — was previously title+venue+date, but venue varied across sources causing the dedup to miss
- `ON CONFLICT (content_hash) DO UPDATE` smart-merges: keeps the best non-null venue/url/desc/neighborhood/cost from whichever source had the more complete row. Description: longer one wins.
- Migration `dedup_cleanup_round2.sql` retroactively collapses ~69 existing duplicate rows, backfilling the winner with the best fields from losers and soft-deleting losers.

### Backfill resolver

After extraction completes, `backfillMissingFields(zipCode)` runs once:

1. Selects up to `BACKFILL_MAX=120` events still missing one or more of url, venue, start_date, neighborhood, description.
2. For each, ONE Haiku web_search call with a focused prompt that returns a JSON object containing only the fields it could verify on real source pages.
3. Sanitizes (URL shape via `looksLikeEventUrl`, length caps, ISO date format), then partial UPDATE — only writes the fields that came back.
4. **Last-resort drop:** rows still missing ALL THREE of (venue, date, url) get `active=false`. On current data, that's 0 rows.

### Removed

- The `BLOCKLIST` filter that skipped events with junk titles is now soft (returns null rather than hard-skip when feasible).
- The strict "no venue → drop" gate from an earlier iteration was relaxed in favor of the backfill-first approach.

## Stage 4: Frontend changes (relevant to the data path)

- **No Google fallback.** `ActionBar.jsx` Open button hides entirely when there's no `url`, `ticket_url`, or `reservation_url`. Pipeline drops these events before they ship anyway, so the button-hidden state is rare.
- **Empty category columns dropped.** `ActiveMode.jsx` filters out categories with 0 events before render. Final ordering: `curated` → populated → `other` (synthetic thin-category bucket).
- **Why-blurb cache scope** changed from `(event_id, profile_id)` to `(event_id)` only. Same blurb works for everyone; ~10× fewer Haiku calls.

## Stage 5: New columns

| Table | Column | Purpose |
|---|---|---|
| `events` | `is_sponsored boolean` | Sponsored event flag (8 self-serving seeds in DB). Renders amber strip + sidebar slot. Migration: `sponsored_events.sql`. |
| `scraped_content` | `parsed_events jsonb` | Per-site parser output. Pipeline tolerates absence. Migration: `add_scraped_content_parsed_events.sql`. |
| `parser_health` | new table | Weekly parser health snapshots. Auto-created by `parserHealth.js`. |

## Pending migrations (none applied yet — Adam-side)

1. [migrations/sponsored_events.sql](migrations/sponsored_events.sql) — `is_sponsored` column + 8 seeds
2. [migrations/remove_meetup_source.sql](migrations/remove_meetup_source.sql) — disables Meetup source + soft-deletes existing meetup events
3. [migrations/dedup_cleanup_round2.sql](migrations/dedup_cleanup_round2.sql) — collapses ~69 existing duplicates
4. [migrations/add_scraped_content_parsed_events.sql](migrations/add_scraped_content_parsed_events.sql) — `parsed_events` JSONB column

Idempotent. Order doesn't matter except meetup before dedup.

## Migrations applied 2026-04-27 via MCP

These were applied directly via the Supabase MCP — no manual paste needed.
Recorded here for posterity:

- `create_restaurant_bookings` — restaurant_bookings cache table (per-
  restaurant booking-platform URLs, populated by services/restaurantDirectory.js)
- `seed_dc_evergreens_round1` — ~70 evergreens across 10 categories that
  had zero coverage (theater, books, drinks, nightlife, comedy, wellness,
  family, activities, shopping, away)
- `seed_dc_evergreens_round2_outdoors_sports` — +9 entries to bulk up
  outdoors and sports
- `add_out_of_dc_sources` — 10 new sources for headliner-tier discovery:
  NYC Go, Time Out NY, Philly Festivals, CFG Bank Arena Baltimore, Visit
  Wilmington DE, Walter E Washington Convention Center, Pennsylvania
  Convention Center, Baltimore Convention Center, Hampton Roads
  Convention Center, Mid-Atlantic Festivals

## Lookahead window (May 2026)

The extractor prompt was rewritten to capture events up to **6 weeks in
the future** (not just this weekend). Most venue calendars publish weeks
ahead — Birchmere, Wolf Trap, AFI Silver, Kennedy Center all post 6+
weeks of upcoming shows. We were throwing 90% of that away by date-
filtering at the prompt level.

Concretely:
- Prompt rule 2 now reads "events happening any time in the next ~6
  weeks (this weekend + 5 weekends after it + weeknights between)"
- expires_at default no longer defaults to "this weekend's Sunday".
  When no end_date is given, falls back to start_date + 1 day; when no
  date at all, falls back to 30 days. Was deactivating future events the
  moment the current weekend rolled.
- Frontend's time-window selector (this-weekend / next-weekend /
  weeknights / this-month) queries the events table by date range, so
  the future events surface in the right view automatically.

## Out-of-metro headliner rule

Sources from other cities (NYC, Philly, Baltimore, Wilmington DE,
Charlottesville, Richmond, Annapolis, Rehoboth) now go through prompt
rule 5c: extract ONLY name-brand headliner-tier events that DC users
would drive 1-3 hours for — multi-day festivals, parades, marathons,
comic-cons, citywide weekends. Skip individual venue listings (a
concert at one Brooklyn club is not a DC user problem). Tag as `away`
or `trips`.

Convention centers go through rule 5d: only consumer-facing expos
(auto/anime/comic/food shows). Skip B2B conferences and trade shows.

## Ongoing issues

| Issue | Status | Notes |
|---|---|---|
| Sources still produce occasional wrong venue/date | Active | Per-site parsers replace Haiku for ~80 sources; coverage will keep growing as we add configs. The remaining ~40 still go through Haiku (where the cardinal "no crossed wires" rule helps). |
| Aggregator events (Smithsonian umbrella, NoVA Parks, etc.) need real per-event venue | Tier-3 fix in place | Backfill resolver does this, ~120 events/run cap. Could expand cap if budget allows. |
| Render free tier cold start (30–60s) | Active | localStorage 5-min TTL stale-while-revalidate absorbs this. Eliminate by upgrading to $7/mo paid tier. |
| `/admin/*` admin endpoints unauthenticated | Critical, not yet fixed | Public URL exposes scrape/extract/clear triggers. Add `X-Admin-Token` middleware before opening to general invitations. |
| Google OAuth shows Supabase project URL on consent screen | Adam-side config | Default Supabase routing. Fix via custom Google Cloud OAuth client (see ROADMAP.md). |
| `parsed_events` column not yet present in DB | Adam-side migration | Pipeline tolerates — falls back to Haiku flow with a console warning. Apply migration to activate full speedup. |
| Per-site parsers can silently regress when a site changes HTML | Mitigated | Weekly `POST /admin/parser-health` flags regressions (events count went from N>0 to 0). |
| Web_search backfill can hit rate limits if many events need URLs | Bounded | `BACKFILL_MAX=120` per run. If exceeded, lowest-base_score events skip backfill that run. |
| Cost: pipeline runs ~$3–4 per full extract+backfill | OK | Most cost is in backfill (web_search @ $0.01 each). Per-site parsers reduce extractor calls; cache hits reduce them further. |
| Custom Google OAuth client (Locale-branded consent screen) | Adam-side | Step-by-step in ROADMAP.md. Code path correct. |

---

## Changes 2026-04-29

### Categories: 21 → 8

The valid-category list in the Haiku prompt is now exactly 8: `music, food, arts, sports, outdoors, family, nightlife, trips`. Each absorbs 2-4 legacy buckets. Folding rules:

| Legacy | New |
|---|---|
| restaurants, drinks, breweries, shopping | food |
| theater, books, film, nerdy | arts |
| comedy | nightlife |
| activities, wellness | outdoors |
| away | trips |

Boot heal `healEventCategoriesToOption2()` rewrites both `category` (text) and `categories[]` for every existing row.

### Pipeline Pass 4: source self-discovery

After Pass 3 (cross-source merge) and the backfill, `discoverSourcesFromAggregators()` runs:
1. SELECT events from Tier-A/B aggregator sources from the last 30 days where `event.url` is set.
2. Extract host, filter against ~30 skip-host rules (aggregators, ticket platforms, social, CDN).
3. Filter against existing `sources` (don't suggest duplicates).
4. Detect singular-event hosts (festival/show/expo/marathon keywords or title-equals-host) — those wait for admin review.
5. Auto-promote: ≥ 2 aggregators OR (1 aggregator AND not singular-event) → INSERT into `sources` and mark suggestion `auto_approved`.
6. Reconciliation pass at the end heals any drift between auto-promote and `source_suggestions.status`.

New columns / tables: none new (`source_suggestions` already existed). New SQL only at the application layer.

### V2 pipeline (shadow)

`src/services/v2/` runs parallel to V1 against the same `scraped_content`. Writes to:
- `events_v2` — canonical row per real-world event with `fingerprint UNIQUE`, `source_names[]`, `source_count`, `storage_kind` (`time_bound|recurring|evergreen`), `region_validated`, `drive_min_from_dc`.
- `pipeline_telemetry_v2` — append-only run log with `candidates_count`, `events_inserted`, `events_merged`, `region_rejected`, `required_field_rejected`, `llm_used`, `llm_yielded`, `duration_ms`, `error`. Heartbeat + finish marker rows let admin tooling detect "started but didn't complete" runs.

Six archetypes drive extraction strategy:
- `single_venue` — JSON-LD → microdata → siteparser, LLM fallback. Examples: 9:30 Club, AFI Silver, Birchmere.
- `district` — same primitives + district default venue/neighborhood. Examples: Mosaic, CityCenterDC, Falls Church City Calendar.
- `editorial_roundup` — LLM only (article schema doesn't yield Event objects). Examples: Washingtonian Weekly, WaPo Going Out.
- `regional_aggregator` — JSON-LD → LLM, strict region. Examples: washington.org, FXVA, Visit-*.
- `ticket_platform` — JSON-LD only, no LLM noise. Examples: Ticketmaster, Eventbrite.
- `api_feed` — handled by sports.js (MLB) directly.

Admin endpoints: `POST /admin/v2/run` (fire-and-forget), `GET /admin/v2/status/:runId` (poll), `GET /admin/v2/compare`, `GET /admin/v2/telemetry`.

### Article-title rejection (Haiku rule 0e)

Skips rows whose title reads like a magazine headline:
- Numbered listicles: `^\d+\+? (Things|Fantastic|Best|Top|Great|Essential)`
- How-to / where-to / what-happened guides
- Restaurant news: `Opens on`, `Humming Along`, `Cheffiest Yet`, `A New X is`
- Neighborhood guides

Boot heal `healArticleTitleEvents()` deactivates historical matches.

### Sort + scoring

- Dropped `+0.03 if cost = Free` boost. Free is a chip filter, not a base_score signal.
- Sort within columns: `start_date ASC`, `final_score DESC` as tiebreaker. Replaces pure-score sort.

### Photos: bulk endpoint

New `GET /api/photos/all?city=X` returns all 8 category photo sets in one round-trip via `getAllCategoryPhotos()`. Used by the desktop card-image system. 24h backend cache + 24h localStorage cache.

### Cron schedule changes

| New cron | Schedule | What |
|---|---|---|
| Sponsored placeholder roll-forward | Every Monday 3:30am | Picks one of 8 sponsored seed events for the week, dates it to upcoming weekend |
| Sports schedule sync | Every Monday 4am | Pulls Nationals MLB schedule via API, upserts to events |
| Source discovery is Pass 4 of every extraction (not its own cron) |

### Admin endpoints added today

```
GET  /api/admin-ui                         single-page dashboard with V2 tab
GET  /api/admin/dashboard                  source health JSON
GET  /api/admin/feed-stats                 feed-level stats
POST /api/admin/sources/:id/reactivate
POST /api/admin/sources/:id/tier
GET  /api/admin/source-suggestions
POST /api/admin/source-suggestions/:id/approve
POST /api/admin/source-suggestions/:id/reject
POST /api/admin/source-suggestions/backfill
POST /api/admin/v2/run
GET  /api/admin/v2/status/:runId
GET  /api/admin/v2/compare
GET  /api/admin/v2/telemetry
GET  /api/photos/all
```

### Render keep-warm

`.github/workflows/keep-warm.yml` pings `/api/pipeline-status` every 10 min. ~6h/month of GitHub Actions quota; defeats Render free-tier cold starts in practice.

---

## Changes 2026-04-30

### Categorization: prompt rewrite + venue-agnostic pattern heal

Audit of 81 active events found 8 mis-bucketed (e.g. Smithsonian "Diplomacy in Melody: Brazil and America in Concert" tagged `arts` instead of `music`; bowling at Pinstripes in `outdoors`). Root cause was prompt-rule conflicts, not venue-specific logic. Three coordinated fixes:

1. **`extractor.js` prompt rewrite (line 182–203)**
   - Adds explicit `PRECEDENCE: when venue and activity disagree, activity wins.` Trivia at a brewery → nightlife. Concert at a museum → music. 5K at a library → outdoors.
   - Tightened `outdoors` to "active participation outside" only. Bowling/bocce/mini-golf/arcades/axe-throwing/escape-rooms moved to `nightlife` (they were stale entries from the old 21-bucket model).
   - `music` includes "in Concert", "Symphony", "Soundscapes", "Recital", "Chamber Music" regardless of venue.
   - `trips` includes any event with venue containing "Overnight Tour" / "Day Tour" / "Bus Tour" OR title naming a non-DC destination.
   - `arts` includes outdoor static art (light shows, lantern displays, photo-op installations).

2. **`db.js healCategoriesByPattern()`** — applies the same rules to existing rows so prompt fixes work on the backlog without waiting for re-extraction. Six pattern rules, all venue-AGNOSTIC (regex on title/venue keywords, zero hardcoded venue names). Wired into `runScheduledHeals()` so cron picks it up between deploys.

3. **`siteParsers.js` Smithsonian default removed.** The pre-parser had `defaults: { categories: ['arts'] }` which locked every Smithsonian-parsed event to arts even if it was a concert or overnight tour. Now neighborhood default only — Haiku (or the pattern heal) picks the bucket per event.

### Admin PATCH /admin/events/:id allows category + active

The endpoint previously allowed `categories` (array) and content fields but NOT `category` (primary) or `active` (kill switch). Future audit work can re-bucket / deactivate from the admin UI without raw SQL.

### Source-coverage diagnosis: 88% empty

Coverage report at audit time:
- 21 sources producing ≥1 active event
- 44 with `consecutive_empty_runs > 0` (empty-track)
- **101 sources never produced**

Common `last_error`: `"All resolved URLs failed"`. Pattern: nearly every failing source is a React/Vue SPA (Kennedy Center, Wolf Trap, Round House, Woolly Mammoth, Alamo Drafthouse) or Cloudflare-blocked (Pearl Street, Lincoln Theatre, Drafthouse Comedy). Direct HTTP returns a JS shell or a 403.

### Scraper: BLOCKED_SITES expansion + better web-search queries

`scraper.js`:

- **`BLOCKED_SITES` expanded from 22 to 65 entries.** All known JS-rendered / Cloudflare-protected venues now skip the futile direct-fetch attempt and go straight to `webSearchScrape`. Coverage gained: most theatres, music venues, cinema chains, library calendars, brewery event pages.

- **`getWebSearchQuery()` tuned per-venue.** Most blocked venues now have explicit `site:venue.com OR site:ticketmaster.com` hints + ticket/showtime keywords. Reduces apology-pattern false-positives (Haiku was hedging because its generic query returned essays about the venue rather than event listings).

- **`isApologyResponse()` tightened.** Threshold for short-hedge detection lowered from 400 to 250 chars, removed 'however,' from the pattern list. Single-show legitimate returns (e.g. one Wolf Trap concert with date + ticket link) often land at 280-380 chars — they were being discarded.

### `scrapeSourcesForZip(zipCode, opts)` accepts source filter

New options:
- `opts.sourceIds` — array of source IDs to restrict the scrape to.
- `opts.filter = 'never-produced'` — shorthand: "active sources with zero events ever extracted." Resolves to a SQL JOIN with `NOT EXISTS (SELECT 1 FROM events WHERE source_id = s.id)`.

Lets the new sweep endpoint target the 101 never-produced sources without re-scraping the full 166-source list.

### Admin: `/admin/sources/sweep` + `/admin/sources/coverage`

```
POST /api/admin/sources/sweep
     body: { zip?, filter? = 'never-produced' }
     → runs scrapeSourcesForZip with the filter, then runExtractionPass.
     → returns per-source success/fail breakdown.

GET  /api/admin/sources/coverage?zip=dc-metro
     → JSON: { summary: {total, producing, empty_track, never_produced, failing}, sources: [...] }
     → diagnoses "why is the feed thin?" at a glance.
```

### Cron-driven maintenance endpoints (added 2026-04-29, documented here)

```
GET  /api/cron/heal       — runs runScheduledHeals (7 idempotent heals + the new pattern heal)
GET  /api/cron/backfill   — runs backfillMissingFields (3-retry queue with 6h cooldown)
GET  /api/events?warm=1   — DB-touching warmer fast-path (keeps pg pool alive)
```

Recommended schedule (external pinger like cron-job.org):
- `/api/events?warm=1` — every 5 min
- `/api/cron/heal` — every 2 hours
- `/api/cron/backfill` — every 6 hours

### Categorization findings — venue-specific logic inventory

Audit confirmed categorization itself is venue-AGNOSTIC. No rule exists like "if venue=X then category=Y" anywhere in the prompt or extractor. Categories come from activity keywords in title/description.

Venue-specific logic DOES exist in three other places (separate concerns):

1. **`siteParsers.js` `defaults` blocks** — 50+ single-venue sources have hardcoded `defaults: { venue: 'Name' }` to fill missing venue field. Affects venue field only, not category. (After today's fix, the Smithsonian `categories: ['arts']` default is gone — was the only one bridging into category territory.)

2. **`extractor.js` SOURCE_DEFAULT_VENUE / SMALL_AREA_BY_SOURCE maps** — 40+ source→venue mappings used by the backfill stage. Venue field only.

3. **`extractor.js` MAJOR_VENUE_KEYWORDS** — 40+ venue names that get +0.06 base_score. **This IS venue bias, but in ranking, not categorization.** A small-bar comedy show scores 0.70; the same act at DC Improv scores 0.76 just because of venue name. Flagged for future replacement with derived signals (multi-source corroboration, has-ticket-URL, has-confirmed-time). Not addressed in this round.

### Drop-points reference (every place an event vanishes)

Documented for ops reference:

**Pre-extraction:**
- HTTP timeout (12s, 3 retries with backoff)
- Web search apology detection
- 40K char text cap (15K with JSON-LD present)
- JSON-LD events truncated to first 60

**Extraction:**
- Haiku output truncation (max_tokens cap)
- Cardinal Rule 0 (no crossed wires) — conservative LLM may skip ambiguous events
- Rule 0e (article-title rejection) — correctly skips listicles, may catch legit "10th Annual X" titles
- Rule 5b (retail store events skip)
- Malformed JSON from Haiku → 0 events from that source for the run

**Post-extraction:**
- `expires_at < NOW()` on insert (recurring events with past start_date land inactive — see `is_recurring` persistence fix in 2026-04-29 changes)
- `content_hash` UPSERT collapses title+date duplicates
- `mergeDuplicateEvents` Pass 3 DELETEs loser rows in venue+date+time and venue-only buckets
- Backfill drop: missing all of (venue, date, url) after 3 retries × 6h cooldown

**Filter / display:**
- Region/distance filter: `WRONG_REGION_TOKENS` → 999 → hidden. `>120 min + score <0.85` → hidden.
- Frontend `isFrontendBlocked`: title=venue suppression + article-headline patterns

### Headless browser fallback (deferred)

Long-term solution for the 65 SPA / Cloudflare-blocked venues. Web search recovers ~70% of those — for the rest (especially small theatres, libraries, and brewery event pages), the pages exist but require JS execution to render the events.

Options when ready to invest:
- **ScrapingBee / Browserless / ScrapingBro** — pay-per-request hosted Playwright. ~$0.001/page. No infra.
- **Self-hosted Playwright** on Render — free but adds 200MB to the dyno and complicates the build.
- **Cloudflare Workers Browser Rendering** — free tier covers ~100K/month. Requires Cloudflare account.

Estimated impact: probably +30 sources from "never produced" → "producing." Music feed especially benefits (9:30 Club, Anthem, Wolf Trap). Out of scope for this round; flagged in ROADMAP.

---

## Changes 2026-05-10

### Listicle expansion (extractor rule 0e + max_tokens)

Empty-feed diagnosis for the May 8-10 weekend showed scrapers were running fine and reaching the right article URLs (Washingtonian's "27 Things to Do in the DC Area This Week and Weekend" was being fetched correctly, 27K chars of body content), but the LLM was emitting the article HEADLINE as one row instead of mining the body for 27 per-item events. Rule 0e correctly killed the headline as a listicle title — and the per-item rows that should have replaced it never materialized.

Two coordinated fixes:

1. **`max_tokens: 3000 → 8000`** in `extractEventsFromSource`. A 27-item listicle at ~200 tokens per row needs 5400+ tokens for the full JSON array. 3000 was truncating output mid-array, which manifested as the LLM emitting just the headline (the only complete element that fit before truncation) and nothing else. 8000 covers a 30-item listicle with margin.

2. **Rule 0e flipped** to lead with positive instruction. Previous version led with "NEVER emit the headline as a row" — the negative rule won and the LLM stopped there, never proceeding to the body-mining instruction. New version leads with "LISTICLE EXPANSION — THIS IS THE MOST IMPORTANT RULE ON THE PAGE" plus a concrete worked example using Washingtonian's actual article. Headline-rejection becomes a corollary at the end.

Recognition patterns for body items now spelled out explicitly: numbered items, day-grouped sections (FRIDAY/SATURDAY/SUNDAY), bold-heading + paragraph blocks, bullet lists, and even unstructured prose ("On Saturday, Bruno Mars plays Cap One Arena at 8pm. Sunday brings a flower festival to the Wharf..." → 2 rows).

### New canonical doc: SCRAPING_PIPELINE.md

Pulled the full scrape→extract→backfill→merge→discover lifecycle out of this changelog-style doc into a dedicated design reference. Covers the 5-stage data flow, source taxonomy, all configuration knobs, drop points, telemetry, costs, and a failure-mode quick reference. Use SCRAPING_PIPELINE.md as the source-of-truth for "how does the pipeline work?" — DATA_PIPELINE.md remains the dated changelog.

### Frontend: tab-pill weekend label drift fix

`App.jsx` weekend-pill computation used `(5 - dow + 7) % 7` to find Friday, which always jumps forward — on Sat/Sun it landed on next Friday instead of this weekend's Friday. Aligned with the backend's `getWeekendDateRange()` and the frontend's `getWeekendDateStr()` / `WeekendSidebar` / `MobileLayout` (which already step backward correctly): Sat → −1, Sun → −2.

### Admin PATCH allows category + active

`PATCH /api/admin/events/:id` body now accepts `category` (primary bucket) and `active` (kill switch) in addition to the existing fields. Future categorization audits don't need raw SQL.

### Pipeline 2 yield monitoring + triage (first build)

First piece of the new Pipeline 2 (Health & Maintenance) architecture. Daily yield-monitoring cron that classifies every active source as `healthy` / `drifted` / `broken` / `unknown` based on:

1. **Catastrophic error patterns** in `last_error` — `403`/`404`/`All resolved URLs failed`/DNS/SSL → `broken`.
2. **Long dormancy** — `events_30d = 0` when source previously produced → `broken`.
3. **Yield drop** — `events_7d_prior >= 3 AND events_7d < events_7d_prior * 0.5` → `drifted`.
4. **Just-stopped** — `events_7d = 0 AND events_7d_prior > 0` → `drifted`.
5. **Two-week silence** — `events_7d = 0 AND events_7d_prior = 0 AND events_30d > 0` → `drifted` (the Strathmore case).
6. **Minor errors with flow** — `last_error AND events_7d > 0` → `drifted`.

Three new schema columns on `sources`: `parser_health`, `parser_health_at`, `parser_health_reason`.

Three new endpoints:

```
GET  /api/cron/source-health        run probe + write parser_health rows + return triage
POST /api/cron/source-health        same; for cron-job.org POST hook
GET  /api/admin/sources/health      read cached parser_health + current 7d/14d/30d counts
GET  /api/admin/sources/health.txt  human-readable triage report (pipe to email)
```

Recommended cadence: daily at 6am ET. Add to cron-job.org alongside the existing `/api/cron/heal` and `/api/cron/backfill` jobs.

Initial triage on the production DB (validation run) caught:
- 4-6 sources flagged `broken` from catastrophic `All resolved URLs failed` errors (Kennedy Center, Pearl Street, Pinstripes Bocce, Destination Gettysburg, Jammin Java)
- 10+ sources flagged `drifted` from yield drops or two-week silence (AFI Silver, Mosaic District, Library of Congress, Aslin Beer, Politics and Prose, etc.)
- ~30 sources `unknown` because they've never produced (the BLOCKED_SITES expansion fix is still propagating)

Pipeline 2 doesn't auto-pause anything. It surfaces the list for operator review. Auto-pause is intentionally deferred — false positives during the source-discovery phase would silently kill good sources.

---

## Changes 2026-05-11

### Admin auth — X-Admin-Token wiring for the new /admin console

The legacy `/api/admin-ui` HTML dashboard already used a manual
`X-Admin-Token` header prompted via `prompt()` and stored in
sessionStorage. The new SPA admin console at `/admin` initially didn't
send it, so every admin tab returned 401.

Fix: `AdminConsole` monkey-patches `window.fetch` for the duration of
its mount. Any request to a URL containing `/admin/` or `/cron/` gets
the cached token injected as `X-Admin-Token` automatically. Token is
prompted via native `window.prompt()` on first admin entry per session;
stored in `sessionStorage['locale-admin-token']`; surfaced in the
header as `🔑 token set` (green) or `🔑 set token` (amber, click to
re-paste). The 401 response clears the cached token via `clearAdminToken()`
so the next call re-prompts.

Tabs themselves use plain `fetch()` calls — no per-tab refactor needed.

### `/admin/overview` consolidated stats endpoint

Powers the Overview tab. Bundles 7 daily-driver SELECTs into one
parallel call via `Promise.all`:

1. Event totals (active / recurring / inactive / backfill_pending)
2. This-weekend events grouped by category (matches `/api/events` filter)
3. Source health summary
4. Recent extractions (last 24h, per-source new event counts)
5. Duplicate hunt — venues with 3+ active events
6. Pipeline activity (last scrape / last event update / pending suggestions)
7. Active sponsored row

Weekend window uses the same Fri/Sat/Sun anchor logic as the feed
(steps backward on Sat/Sun).

### `/admin/cleanup/stale-undated` one-shot

Deactivates events with `start_date < CURRENT_DATE` AND `end_date IS NULL`
— catches series-wrapper rows (e.g. Sunset Cinema at The Wharf where
the extractor pulled one start_date and no end) that escape the
stale-expiry heal. Manual operator action; not added to the boot heal
sequence to keep the heal idempotent and low-risk.

### Reddit ingestion

`services/redditFetcher.js` plugs into the scraper BEFORE direct HTTP
or headless routing. URL-host detection (any `reddit.com` host),
converts to the `.json?limit=50` listing variant, fetches with a custom
User-Agent, applies an event-relevance keyword filter, and renders
surviving posts as plain text for the extractor. New prompt rule 0f
treats Reddit content as user-generated — only emits events when the
post has BOTH a specific date AND a venue.

Yield: ~10-15 event-relevant posts per subreddit per fetch survive the
filter, ~3-8 become events after Haiku's date+place check. Six
subreddits seeded.

### Headless browser fallback

`services/headlessBrowser.js` wraps ScrapingBee / Browserless / ZenRows
behind `HEADLESS_PROVIDER` + `HEADLESS_API_KEY` env vars. Default off
(`HEADLESS_PROVIDER=none`). Opt-in by setting the provider; the
scraper then routes sources with `use_headless=true` or in
`BLOCKED_SITES` through the headless service for JS-rendered HTML
before falling back to web search.

Per-source toggle in `/admin#sources` (purple `🌐 on` / ghost `off`
badge). Auto-flipped to true by the validation probe when
recommendation == `needs-headless`.

`GET /api/admin/headless/status` returns `{ configured, provider }`.
The Sources tab surfaces a warning banner when any source has
`use_headless=true` but no provider is configured server-side.

### Validation gate enforced

`POST /admin/sources/add` runs `validateUrl()` inline before INSERT.
If probe returns `blocked` or `no-events`, source lands with
`active=false` + `validation_status='failed'`. Operator can manually
flip active via the row's toggle. `skipValidation: true` in the
request body bypasses (recovery scripts). UI surfaces the verdict
in a new "Result" step of the AddSourceModal.

### Endpoints recap (added 2026-05-10 / 2026-05-11)

```
GET  /api/admin/overview                    bundled stats for Overview tab
GET  /api/admin/headless/status             { configured, provider }
GET  /api/admin/db/tables                   whitelisted table list + counts
GET  /api/admin/db/table/:name              paginated rows with search/sort
POST /api/admin/db/query                    read-only SQL playground
GET  /api/admin/sources/coverage            source state breakdown
POST /api/admin/sources/sweep               targeted scrape with filter
POST /api/admin/sources/:id/validate        run validation probe
GET  /api/admin/sources/:id/fixtures        list fixtures for a source
POST /api/admin/sources/:id/fixtures/capture  capture from live URL
POST /api/admin/fixtures/:id/replay         replay one fixture
DELETE /api/admin/fixtures/:id              remove a fixture
POST /api/admin/sources/:id/author-extractor  Sonnet → extractor_config
POST /api/admin/extractor/author            same, sandbox mode (no source row)
POST /api/admin/sources/:id/test-extractor  dry-run a config against live HTML
POST /api/admin/cleanup/stale-undated       deactivate ghost rows
PATCH /api/admin/sources/:id                whitelisted source-row updates
GET  /api/cron/source-health                Pipeline 2 yield monitoring
GET  /api/cron/parser-drift                 Pipeline 2 fixture replay
```

All `/admin/*` routes require `X-Admin-Token`. All `/cron/*` routes are
unauthenticated (called by cron-job.org).

