# Locale Scraping Pipeline — Design Reference

> **Status:** as of 2026-05-10. Canonical reference for how a URL on the
> internet becomes a row in the events table. Owns the full
> `source → scraped_content → events` lifecycle.

---

## 1. Mental Model

The pipeline is a 5-stage Unix-y data transform:

```
sources (config)
   │
   ▼
[1] SCRAPE                 raw bytes → cleaned text + structured hints
   │   timeout/retry/fallback
   ▼
scraped_content (cache)
   │
   ▼
[2] EXTRACT                cleaned text → event rows (LLM)
   │   prompt-cached static rules
   ▼
events (raw)
   │
   ▼
[3] BACKFILL               fill missing fields via web_search (queued, retried)
   │   3-attempt budget, 6h cooldown
   ▼
[4] MERGE                  collapse cross-source duplicates
   │   3 bucketing strategies, title-similarity guard
   ▼
[5] DISCOVER               mine venue URLs → new sources
   │
   ▼
events (canonical) → relevancy → feed
```

Each stage is idempotent. Each writes to a table the next stage reads.
Re-running the pipeline against the same `scraped_content` produces the
same canonical `events` (modulo Haiku non-determinism).

Three cross-cutting heals run on cron + boot to keep the table clean:

```
healStaleEventExpiry          deactivate when expires_at < NOW()
healArticleTitleEvents        kill listicle-headline rows that slipped past 0e
healCategoriesByPattern       venue-agnostic category corrections
healEventCategoriesToOption2  legacy 21-bucket → 8-bucket remap
healMissingVenuesFromSourceDefaults    fill venue from per-source defaults
healMissingDatesForRecurringVenues     pin recurring date to upcoming Sat/Sun
rotateSponsored               keep 1 of 8 sponsored seeds active per week
```

---

## 2. Source Taxonomy

The `sources` table is the input config for stage 1.

### 2.1 Columns that drive routing

| Column | Values | Effect |
|---|---|---|
| `type` | `scrape` / `pattern` / `api` | Picks scrape strategy. `api` → custom code (sports.js). `pattern` → dynamic URL resolver. `scrape` → static URL. |
| `source_type` | `aggregator` / `venue` / `editorial` | Used by source-discovery + scoring; doesn't affect scrape itself. |
| `source_tier` | `A` / `B` / `C` / `D` | Score boost magnitude. Tier-A = +0.15 base_score, D = -0.05. |
| `category_hint` | one of 8 buckets | Default category when extractor returns null. |
| `active` | bool | Master kill switch; dormant sources keep their config but don't scrape. |
| `last_extracted_hash` | text | Idempotency cache: skip extraction if the raw_text hash already produced rows this weekend. |
| `consecutive_empty_runs` | int | Bookkeeping for past auto-pause logic (currently inert). |
| `field_contract` | JSONB | Per-source promise about what fields are/aren't provided. Skips backfill calls for `never_provides` fields. |

### 2.2 Three source archetypes

These map to scrape strategy, NOT to schema:

1. **Single-venue sources** (e.g. `9:30 Club Shows`, `Kennedy Center Calendar`).
   One physical venue, one URL. Backfill assumes the venue is the source's
   default if extractor returns null.
2. **Small-area aggregators** (e.g. `Mosaic District Events`, `Falls Church
   City Calendar`). Multiple venues but a walkable district. Default
   `neighborhood`; venue is per-event.
3. **Large/dispersed aggregators** (e.g. `Washingtonian Weekly`,
   `washington.org`, `DCist Weekend Events`). Editorial roundups that
   cite many venues across the metro. No defaults — everything from prose.

The extractor's **TIER 1/2/3 venue rule** in the Haiku prompt enforces this
classification. It's not strict — the LLM is just told to use the source's
context as a default when prose is silent.

---

## 3. Stage 1 — Scrape

### 3.1 Strategies, ordered by cost

```
isBlocked(source) ── yes ──▶ webSearchScrape (Haiku web_search tool)
       │
       no
       ▼
   directScrape          ── fail (any reason) ──▶ webSearchScrape
       │                        (last_error logged on first failure)
       success
       ▼
   ┌── parsedEvents (per-site HTML parser)
   └── text (htmlToText)
```

`isBlocked` is a manual allowlist of sources known to be JS-rendered SPAs
or Cloudflare-protected. As of this writing, 65 entries — every theatre,
most music venues, library calendars, brewery event pages, cinema chains.
For these, direct HTTP returns either a JS shell (`<div id="root">`) or a
403, so we skip the futile attempt and route straight to web search.

### 3.2 directScrape

For `type='scrape'`: tries `source.url` directly.

For `type='pattern'`: calls a per-source resolver function in
`PATTERN_RESOLVERS` that fetches a hub page, finds matching article-link
patterns, and returns the latest 1-3 article URLs to scrape. Used for
weekly publications (Washingtonian Weekly, WaPo Going Out Guide, DCist
Weekend Events, etc.) whose canonical URL changes every issue.

For each resolved URL:

1. `axios.get` with 12s timeout, 3 retries, exponential backoff (0/1.2s/3.5s).
2. Returned HTML goes through:
   - `extractJsonLdEvents` — pulls schema.org/Event from `<script>` tags.
   - `extractStructuredHints` — pulls Open Graph meta, microdata, `<address>`,
     `<time datetime>`.
   - Per-site parser if one exists (`siteParsers.js`). First strategy that
     yields ≥1 events wins; remaining strategies skipped.
   - `htmlToText` — strips scripts/styles/nav/footer, preserves `<a href>` as
     `[URL:…]` markers, collapses whitespace. Capped at 40K chars (15K when
     JSON-LD is present — the structured data is canonical, prose is fluff).
3. Output: `{ text: "JSON-LD preamble + Structured Hints + prose", parsedEvents }`.

If the for-each loop produces zero usable text (every retry failed across
every URL), throws `"All resolved URLs failed"`. Caller catches and falls
through to web search.

### 3.3 webSearchScrape

Uses Anthropic Haiku with the `web_search_20250305` tool. Per-source query
template lives in `getWebSearchQuery(source, dateRange)`. Strong queries use
`site:venue.com OR site:ticketmaster.com` hints + ticket/show keywords. Weak
queries (just the venue name) tend to trip apology patterns.

`max_tokens: 4000` for web_search responses. Returns null on:

- text length < 100 chars
- `isApologyResponse(text)` returns true (preamble like "I can't use site:",
  hedge phrasing like "could not find any events", or wrong-region drift like
  "Arlington, Texas")

### 3.4 Per-site parsers

`siteParsers.js` defines per-source HTML extraction primitives. Each source's
config picks an ordered list — first non-empty result wins.

Primitives:

- `jsonLd` — pull schema.org/Event JSON-LD blocks.
- `microdata` — `<div itemscope itemtype="schema.org/Event">` blocks.
- `tribe` — WordPress Tribe Events Calendar tooltip data.
- `articleList` — generic `<article>`, `<li class="event">`, `<div class="event-item">` containers.
- `custom` — named function (e.g. `parseSmithsonian`).

Plus 50+ source-specific `defaults: { venue, neighborhood }` blocks that
fill the venue field when the parser doesn't find one. Categorically NOT
allowed: `defaults: { categories: [...] }` — that bypasses Haiku and was
the source of the Smithsonian-arts bug. Removed 2026-04-30.

When a parser yields events, those skip the Haiku extraction call entirely
and feed straight into the upsert.

### 3.5 Output

Stage 1 writes one row per source per scrape pass to `scraped_content`:

```sql
INSERT INTO scraped_content (source_id, raw_text, parsed_events, scraped_at, success, expires_at)
VALUES ($1, $2, $3, NOW(), true, NOW() + INTERVAL '25 hours');
```

The 25h TTL gives stage 2 a window to re-process if extraction crashed. On
success, sources get `last_ok = NOW(), last_error = NULL`. On fail,
`last_error = <message>`.

---

## 4. Stage 2 — Extract

### 4.1 Prompt structure

Two-block prompt for cache efficiency:

- **`STATIC_EXTRACTION_RULES`** (~1.5K tokens) — cached via Anthropic prompt
  cache. Rules block, category definitions, the cardinal "no crossed wires"
  rule, listicle expansion, retail-store skip, etc. Cache hit rate ~95% in
  practice; only invalidates when the rules text itself changes.
- **Dynamic context** — source name, weekend dates, raw text. Not cached.

`max_tokens: 8000` (raised from 3000 on 2026-04-30). A 27-item listicle at
~200 tokens per row needs 5400+; 3000 truncated mid-array, which manifested
as the LLM emitting just the article headline and nothing else. 8000 covers
a 30-item listicle with margin.

### 4.2 Rule highlights (categorization-relevant)

The full prompt is in `extractor.js` lines 140-220. Key rules:

- **0a — Cardinal rule (no crossed wires).** Every field for an event must
  come from the same paragraph/block. Never mix title from event A with
  date from event B. This is what stops the "Best of the Apollo at
  Nationals Park" failure mode.
- **0b — No hallucination.** If a fact isn't directly visible in the prose
  near the title, set it to null. The backfill pass resolves later.
- **0c — Required fields.** Title + start_date are mandatory for emission.
  Venue is preferred but optional.
- **0d — Apology/prose-dump suspicion.** When the source text starts with
  apology preambles, be extra suspicious — that's web-search drift.
- **0e — Listicle expansion (THE most important rule).** Aggregator articles
  embed 10-25 events inside one article body. Each item is a row. The
  article HEADLINE goes nowhere. Spelled out with concrete worked examples
  (Washingtonian's "27 Things to Do") and recognition patterns (numbered,
  day-grouped, bold-heading, bullet, prose).
- **3 — Three-tier venue rule.** Single-venue → fill from source default.
  Small-area aggregator → fill venue + neighborhood from area name.
  Large/dispersed → only fill when prose explicitly names a venue.
- **5b — Retail store skip.** No Sephora/Anthropologie marketing events.
- **9 — Categories.** 8 buckets with explicit precedence: when venue and
  activity disagree, activity wins. Trivia at a brewery → nightlife.

### 4.3 Output processing

For each event in the LLM's JSON array:

1. `normalizeTitleForHash` — strip promotional prefixes ("Spotlight:",
   "Throwback:") and trailing qualifiers ("(matinee)", "(rescheduled)").
2. `contentHash` — MD5 of `normalized_title + '::' + (recurring ?
   'recurring' : start_date)`. **Venue intentionally excluded** — same
   event from 4 sources reports 4 venue strings ("Kennedy Center", "Trump
   Kennedy Center", "Trump Kennedy Center Grand Foyer", null) and we want
   them to collapse.
3. `calculateBaseScore` — starting at 0.5, adds confidence + completeness
   + ticket URL + description quality + cost + venue-keyword boost.
4. `expires_at` — end_date 23:59:59 if present, else start_date 23:59:59,
   else NOW + 30d.
5. UPSERT with `ON CONFLICT (content_hash) DO UPDATE SET …` that:
   - Prefers non-null fields from whichever source had them
   - Picks the longer description
   - Promotes `confidence='confirmed'` if any source confirms
   - Takes `GREATEST(base_score)`
   - Makes `is_recurring` monotonic (`OR` semantics) — once any source
     flags an event recurring, it stays recurring

### 4.4 Output

Inserts/updates rows in `events`. Tracks per-source telemetry: events
extracted, events skipped (duplicate hash), events cache-skipped (raw_text
hash matches `last_extracted_hash`).

---

## 5. Stage 3 — Backfill

Decoupled from extraction so transient failures don't drop events.

### 5.1 Queue model

Two columns on `events`:

- `backfill_attempts INT DEFAULT 0` — bumped each time backfill runs against
  this row, regardless of success.
- `backfill_last_at TIMESTAMPTZ` — wall-clock timestamp of last attempt.

### 5.2 Selection

```sql
SELECT … FROM events e LEFT JOIN sources s ON s.id = e.source_id
WHERE active=true
  AND (url IS NULL OR venue IS NULL OR start_date IS NULL OR neighborhood IS NULL OR description IS NULL)
  AND COALESCE(backfill_attempts, 0) < 3
  AND (backfill_last_at IS NULL OR backfill_last_at < NOW() - INTERVAL '6 hours')
ORDER BY base_score DESC NULLS LAST
LIMIT BACKFILL_MAX;
```

3 attempts × 6h cooldown = up to 18h of retries before giving up.

### 5.3 Per-event backfill

`backfillOneEvent(evt)` calls Haiku with `web_search` tool. Asks for any
of the missing fields. Honors the source's `field_contract.never_provides`
to skip fields the source structurally doesn't carry (e.g. WaPo roundup
columns never have ticket URLs — searching for one wastes credits and
risks scraping the wrong link).

Returns a partial object with only fields the search verified. Updates
proceed via dynamic UPDATE that ONLY sets fields still null (concurrency
guard).

### 5.4 Drop policy

Last-resort drop — events that exhausted all 3 retries AND still lack ALL
THREE of (venue, date, url) get `active=false`. Anything with at least 2
of 3, or with retries remaining, stays.

### 5.5 Trigger

Runs as Pass 2 inside `runExtractionPass` AND independently via
`POST /api/cron/backfill` (recommended every 6h via cron-job.org).

---

## 6. Stage 4 — Cross-source Merge

### 6.1 Why content_hash isn't enough

`content_hash` collapses events with identical normalized titles. But
cross-source variants survive:

- "Spirit vs Current" (WaPo) + "Throwback Night: Spirit vs Current"
  (Ticketmaster) + "Washington Spirit Game" (washington.org)
- AFI Silver multiplex with two different films at the same time
- Pinstripes Bowling + Pinstripes Bowling & Bocce + Pinstripes DC Bowling

### 6.2 Three bucketing strategies

1. **Ticket URL bucket** (`tk::canonical_url::date`) — strongest. Same
   ticketing page = same event by definition.
2. **Venue+date+time bucket** (`vts::venue::date::time`) — strong, but
   needs title-similarity guard. Without it, two different movies at the
   same multiplex same start time would falsely merge.
3. **Venue-only bucket** (`v::venue`) — weakest. Catches recurring weekly
   events ("Bowling at Pinstripes" / "Pinstripes Bowling Night") that
   lack start_time and have drifting is_recurring flags. Gated by:
   - Title similarity check (transitive)
   - 21-day window OR is_recurring=true on at least one row in cluster

### 6.3 Merge mechanics

For each cluster of 2+ rows:

1. Sort by richness (count of non-null/non-empty informative fields +
   base_score + confidence weight).
2. Winner is the richest row.
3. For each loser, COALESCE non-null fields into winner. Description: pick
   the longer one. is_recurring: OR semantics.
4. UPDATE winner with merged fields. DELETE losers.

### 6.4 Trigger

Pass 3 of `runExtractionPass`, immediately after backfill. Also runs in
isolation when cron heals fire (no separate trigger; the merge logic is
also re-applied via `mergeDuplicateEvents` if called directly).

---

## 7. Stage 5 — Source Discovery

`sourceDiscovery.js` Pass 4. Mines venue URLs from aggregator-extracted
events to find new sources to scrape.

### 7.1 Mechanism

1. Pull all events from Tier-A/B aggregator sources extracted in the last
   N days.
2. For each event with a non-null `url`, parse the host.
3. Skip-filter:
   - Hosts in `SKIP_HOSTS` (~30 ticket platforms, social, CDN, search).
   - Hosts already present in `sources`.
4. Group by host. Count distinct aggregators that mentioned each.
5. Singular-event detection: hosts whose name OR title contains `festival`,
   `fest`, `expo`, `marathon`, `gala`, `parade` AND whose count of distinct
   titles is 1 → flag as singular event, not recurring venue.
6. Auto-promote rule:
   - ≥2 distinct aggregators mentioned the host → auto-add to `sources`
     with `source_type='venue'`, `source_tier='C'`, `active=true`.
   - 1 aggregator mentioned the host AND it's not flagged singular →
     auto-add.
   - Otherwise → write to `source_suggestions` for admin review.

### 7.2 Reconciliation

Final pass syncs drift between `source_suggestions.status` and `sources`
membership — if a suggestion was auto-promoted but the suggestion row
still says `pending`, flip it to `auto_approved`.

---

## 8. Region/Distance Filter

`distance.js` computes one-way drive minutes from DC metro for each event.

### 8.1 Heuristic

Text scan of `venue + address + neighborhood` against:

- `WRONG_REGION_TOKENS` (Bush Library TX, Arlington WA, presidential
  libraries, etc.) → returns 999 → forces hide.
- `STADIUM_DRIVE_MINUTES` (Wrigley Field 600m, Yankee Stadium 240m, etc.).
  Beats city tokens — handles "Nationals @ White Sox at Guaranteed Rate
  Field" where address is null.
- `CITY_DRIVE_MINUTES` — 6 buckets (20/30/50/90/150/240) covering DC
  metro core, inner suburbs, day-trip range, distant.
- `SOURCE_NAME_HINTS` — fallback when address is sparse but source name
  is regional ("Visit Charlottesville" → 150min).

### 8.2 Filter policy

```js
if (minutes == null) keep;                 // unknown — assume local
if (minutes <= 120)  keep;                 // anything within 2h
if (score >= 0.85)   keep with reason;     // headliner override
else                 hide;                 // far + low score
```

The "headliner override" exists so e.g. a great Charlottesville winery
festival with score 0.9 still surfaces despite being 150min out.

### 8.3 V2 region gate

`v2/region.js` runs an earlier, harder gate at extraction time. Drops
events whose venue/address/title contains wrong-region tokens before
they get persisted. Belt-and-suspenders.

---

## 9. Heals

7 idempotent passes that run on boot AND every cron tick (`/api/cron/heal`,
recommended every 2h).

| Heal | What |
|---|---|
| `healStaleEventExpiry` | `active=false` where `expires_at < NOW()` |
| `healNullCategoryEvents` | Set `category` from `categories[0]` when null |
| `healMissingVenuesFromSourceDefaults` | Fill venue from per-source defaults (7 mappings) |
| `healMissingDatesForRecurringVenues` | Pin `start_date` to upcoming Sat/Sun for is_recurring rows |
| `healEventCategoriesToOption2` | Legacy 21-bucket → 8-bucket remap (`comedy → nightlife`, `theater → arts`, etc.) |
| `healCategoriesByPattern` | Venue-AGNOSTIC pattern recategorization (concerts → music, tours → trips, trivia → nightlife, races → outdoors, static-art → arts, indoor-leisure → nightlife) |
| `healArticleTitleEvents` | Deactivate listicle-style titles that slipped past rule 0e |
| `rotateSponsored` | Keep 1 of 8 sponsored seeds active per week |

Order matters: stale-expiry runs first (reactivates upcoming events),
sponsored rotation runs last.

---

## 10. Drop Points (where events vanish)

Catalog of every place a row gets deactivated or never lands. Useful for
"why is the feed thin?" diagnosis.

### Pre-extraction
- HTTP timeout (12s × 3 retries with backoff)
- Web search apology detection (`isApologyResponse` returns true)
- 40K char text cap (15K with JSON-LD)
- JSON-LD events truncated to first 60

### Extraction
- Haiku output truncation (was 3000 max_tokens, now 8000 — 3000 caused
  silent drop of all rows past the truncation point)
- Cardinal Rule 0a (no crossed wires) — conservative LLM may skip ambiguous
  events
- Rule 0e (article-title rejection) — correctly skips listicle headlines,
  may also skip legit "10th Annual X Festival" titles
- Rule 5b (retail store events skip)
- Malformed JSON from Haiku → 0 events from that source for the run

### Post-extraction
- `expires_at < NOW()` on insert (recurring events with past start_date
  land inactive — fixed via is_recurring persistence + monotonic UPSERT)
- `content_hash` UPSERT collapses title+date duplicates (intentional)
- `mergeDuplicateEvents` Pass 3 DELETEs loser rows
- Backfill drop: missing all of (venue, date, url) after 3 retries × 6h

### Filter / display
- Region/distance: `WRONG_REGION_TOKENS` → 999 → hidden. `>120 min + score
  <0.85` → hidden.
- Frontend `isFrontendBlocked`: title=venue suppression + article-headline
  patterns

---

## 11. Configuration / Tuning Knobs

| Knob | File | Default | Effect |
|---|---|---|---|
| `SCRAPE_TIMEOUT` | scraper.js | 12000ms | Per-URL HTTP timeout |
| `MAX_CHARS` | scraper.js | 40000 | Cleaned text cap (15K with JSON-LD) |
| `BACKFILL_MAX` | extractor.js | 120 | Max events per backfill pass |
| `BACKFILL_MAX_ATTEMPTS` | extractor.js | 3 | Retry budget per event |
| `BACKFILL_COOLDOWN_HOURS` | extractor.js | 6 | Min wait between attempts |
| `BATCH_SIZE` (scraper) | scraper.js | 8 | Sources scraped in parallel |
| `BATCH_SIZE` (extractor) | extractor.js | 10 | Sources extracted in parallel |
| `max_tokens` extraction | extractor.js | 8000 | Haiku response budget |
| `max_tokens` web_search | scraper.js | 4000 | Haiku web_search response |
| `max_tokens` backfill | extractor.js | 600 | Haiku per-event backfill |
| Distance cap | distance.js | 120min | Soft cap; >120min hidden unless score≥0.85 |
| Astronomical threshold | distance.js | 0.85 | Score that bypasses distance cap |
| `BLOCKED_SITES` | scraper.js | 65 entries | Sources that skip direct HTTP |

---

## 12. Telemetry

Every pipeline run writes rows to `pipeline_telemetry_v2`:

- Heartbeat row at start.
- Per-source success/fail/method (direct, search, parser+search, etc.).
- Per-stage counts: scraped, extracted, backfilled, merged, discovered.
- Finish-marker row with totals + duration.

Surfaced via `GET /api/admin/v2/telemetry` and `GET /api/admin/dashboard`.
Used to diagnose "did the pipeline actually run?" and "which sources are
failing?"

Coverage report at `GET /api/admin/sources/coverage` shows
producing / empty-track / never-produced breakdown — the headline metric
for "is the source list healthy?" Audit threshold: producing should be
>50% of active. Below that, something structural is broken (deploy stuck,
BLOCKED_SITES needs expansion, web search apology rate spiking, etc.).

---

## 13. Costs

Per pipeline run (typical ~166 sources):

- Scrape stage: ~30 web_search calls × $0.01 = $0.30
- Extract stage: ~100 Haiku calls × $0.005 = $0.50 (heavy cache-hit
  reduces effective input cost)
- Backfill stage: ~30 web_search calls × $0.01 = $0.30
- **Per run: ~$1.10**
- **Per day at 4 runs/day: ~$4.40**
- **Per month: ~$130**

Anthropic prompt cache TTL is 5 minutes — keeping pipeline cadence under
that window dramatically reduces extraction cost (the 1.5K-token rules
block hits cache on every call after the first).

---

## 14. Failure Modes Quick Reference

| Symptom | Likely cause | Diagnose with |
|---|---|---|
| Feed empty for current weekend | Listicles got correctly killed but per-item rows didn't materialize → check max_tokens, prompt rule 0e | `SELECT COUNT(*) WHERE start_date BETWEEN <fri> AND <sun>` |
| 88% sources never_produced | JS-rendered SPAs failing direct HTTP | `GET /admin/sources/coverage` |
| Same event appearing 12× | content_hash drift across sources | `SELECT venue, COUNT(*) FROM events GROUP BY venue HAVING COUNT(*) > 5` |
| Wrong region drift | venue/address contains non-DC tokens | check `WRONG_REGION_TOKENS` list |
| All sources "All resolved URLs failed" | Render not redeployed OR scraper crashed before write | `MAX(scraped_at)` on `scraped_content` |
| Haiku returns just article headline | max_tokens too low for listicle | Expected: 8000+ |
| Nothing in `is_this_weekend=true` | Date computation drifted | Check `getWeekendDateRange` vs `getWindowDates` |
| Recurring event pinned to NEXT weekend | Date-pinning function jumps forward on Sat/Sun | Sat → -1, Sun → -2 in date helpers |

---

## 15. Glossary

- **Content hash:** MD5 of normalized_title + date. Primary dedup key.
- **Pattern source:** A source whose canonical URL changes per issue;
  uses a resolver function to find the latest.
- **Pre-parsed event:** Event extracted by a per-site HTML parser before
  Haiku gets involved; bypasses extraction.
- **Listicle expansion:** The behavior of extracting per-item event rows
  from inside an aggregator article body, instead of emitting the
  article's headline as one row.
- **Spanning event:** An event whose `start_date < target_window_start`
  but `end_date >= target_window_start` — an ongoing run (theater,
  exhibit, residency).
- **Headliner override:** Distance filter bypass for events with
  `base_score >= 0.85`. Lets faraway-but-amazing events still surface.
- **Source contract:** JSONB `field_contract` per source declaring what
  fields it provides / never provides. Used to skip backfill calls.

---

## 16. Versions

This doc reflects the pipeline as of 2026-05-10. Changes worth flagging
in future revisions:

- 2026-05-10: max_tokens extraction 3000 → 8000; rule 0e flipped
  to lead-with-listicle-expansion.
- 2026-04-30: BLOCKED_SITES expanded 22 → 65; per-venue web-search
  queries tuned; admin sweep + coverage endpoints added; Smithsonian
  arts-default removed.
- 2026-04-29: Persistent backfill queue (3 × 6h); cron-driven heals;
  per-source field contracts; embassies + cultural sources seeded;
  warmer endpoint + cron-job.org documentation; venue+activity merge
  bucket; is_recurring persistence + monotonic UPSERT.
- 2026-04-28: V2 shadow pipeline; source self-discovery (Pass 4);
  Option-2 8-bucket categorization; article-title rejection (rule 0e);
  major venue keyword scoring boost.
