# Locale Scraping Architecture — Design Reference

> **Status:** as of 2026-05-10. Canonical reference for how an event in
> the world becomes a row in the events table. The architecture splits
> into three pipelines with different cadences, consumers, and rules of
> engagement.

---

## 1. Architecture: Three Pipelines

The original design conflated "is this source worth scraping?" with
"scrape this source right now." Splitting them lets each pipeline run
on the cadence and reliability profile it actually needs.

```
┌────────────────────────────────────────────────────────────────────┐
│ Pipeline 1: ONBOARDING                  cadence: low (per source)  │
│ Discovery → Validation → Categorization → Custom extractor → Ship  │
│ Output: a new row in `sources` with custom logic ready to run      │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  (sources are now in service)
┌────────────────────────────────────────────────────────────────────┐
│ Pipeline 3: RUNTIME                  cadence: high (every 1-4h)   │
│ Scrape → Extract → Backfill → Merge → events table                 │
│ Hot path. No human in the loop. Expected idempotent + cheap.       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼  (telemetry on yield + errors)
┌────────────────────────────────────────────────────────────────────┐
│ Pipeline 2: HEALTH & MAINTENANCE          cadence: medium (daily) │
│ Probe → Drift detection → Yield monitoring → Auto-pause / patch    │
│ Catches sites that redesigned, parsers that broke, sources that    │
│ stopped publishing. Patches custom logic via Pipeline 1 reentry.   │
└────────────────────────────────────────────────────────────────────┘
```

**Pipeline 1** is mostly human-in-the-loop, runs irregularly, may take
several iterations per source before it ships. Custom extractor code
gets written and tested here.

**Pipeline 2** is fully automated, runs daily, surfaces issues for
human review when a source's behavior changes. Doesn't write events —
writes diagnostics and either auto-pauses sources or kicks them back
into Pipeline 1 for re-onboarding.

**Pipeline 3** is the hot path. It's already what runs in production
today. Pipelines 1 and 2 are the build-out.

### The custom-extractor shift

Most sources should have **bespoke extractors**, not the generic Haiku
prompt. A custom function for "Wolf Trap" that reads their JSON-LD or
specific repeating div structure is:

- **More reliable** — no LLM hallucination risk, no apology-pattern
  failures, no token-truncation edge cases.
- **Cheaper** — no Anthropic call per extraction.
- **Faster** — no 1-3 second LLM round-trip per source.
- **More accurate** — exact field mapping vs. fuzzy interpretation.

Today only Smithsonian Associates has a true custom function
(`parseSmithsonian` in `siteParsers.js`). Most sources fall back to
generic primitives + Haiku. Target state: ~80% of sources have either
generic primitives that work cleanly OR a hand-written / LLM-authored
custom parser. Haiku stays as a fallback for new sources, listicles,
and editorial roundups whose structure varies week to week.

---

## 2. Source Taxonomy

The `sources` table is the shared schema across all three pipelines.

### 2.1 Core columns

| Column | Values | Used by |
|---|---|---|
| `type` | `scrape` / `pattern` / `api` | Pipeline 3 routing |
| `source_type` | `aggregator` / `venue` / `editorial` | Discovery + scoring |
| `source_tier` | `A` / `B` / `C` / `D` | Scoring weight |
| `category_hint` | one of 8 buckets | Default category fallback |
| `extractor` | `auto` / `custom:<fn_name>` / `haiku` | **NEW** — Pipeline 3 chooses extraction path |
| `extractor_config` | JSONB | **NEW** — selector hints, field mappings, regex |
| `parser_health` | `healthy` / `drifted` / `broken` | **NEW** — Pipeline 2 writes |
| `parser_health_at` | timestamptz | **NEW** — last health check |
| `active` | bool | Master kill |
| `field_contract` | JSONB | Skip backfill for fields source never provides |

`extractor` and `extractor_config` are the new columns the custom-
extractor shift requires. `parser_health` is what Pipeline 2 uses to
surface drift.

### 2.2 Source archetypes

Maps to extraction strategy, not schema:

1. **Single-venue sources** (e.g. `9:30 Club Shows`, `Kennedy Center`).
   One physical venue, one URL. Custom parser usually reads venue's
   structured data or a known repeating div. Backfill assumes venue =
   source default if extractor returns null.
2. **Small-area aggregators** (e.g. `Mosaic District Events`, `Falls
   Church City Calendar`). Multiple venues but a walkable district.
   Custom parser handles per-event venue extraction; defaults fill
   neighborhood.
3. **Large/dispersed aggregators** (e.g. `Washingtonian Weekly`,
   `washington.org`, `DCist Weekend Events`). Editorial roundups.
   Listicles. Custom parser is impractical — structure varies week to
   week. Haiku with rule 0e (listicle expansion) handles these.
4. **Ticket platforms** (e.g. `Eventbrite NoVA`, `Ticketmaster DC`).
   Structured JSON-LD or API. Custom parser reads JSON-LD directly;
   fastest and cheapest.
5. **API feeds** (e.g. `MLB Schedule`, `DC United Schedule`). Bypass
   scrape entirely; fetch structured JSON, write to events.

Today's mix: ~80 single-venue, ~10 small-area, ~30 large-aggregator,
~15 ticket-platform, ~5 API. The bottom 100 are the long tail of
single-venue sources where custom parsers would have the highest
return.

---

## 3. Pipeline 1 — Onboarding

> **Cadence:** human-driven, per-source. Maybe 5-20 sources per cycle.
> **Status:** discovery + sourcing built; validation + custom-extractor
> authoring partially built; categorization is a manual step today.
> **Goal:** new source goes from "I noticed this venue exists" to "it's
> reliably producing events in Pipeline 3" in under a day.

### 3.1 Stage 1A — Discovery

Three pathways for a host to enter the candidate set:

**A1. Manual admin add.** Operator (Adam) finds a venue → `POST
/api/admin/sources/add` with `{name, url, source_type, category_hint}`.

**A2. Hand-curated boot seeds (idempotent).** Three current seeds in
`services/db.js`:`testConnection()`:

- `seedSourceTiers()` — assigns A/B/C/D by name regex.
- `seedSourceContracts()` — assigns `field_contract` JSONB for known
  roundup-style sources.
- `seedEmbassyAndCulturalSources()` — adds 8 embassy + cultural
  institutes that no aggregator covers.

**A3. Auto-promotion from feedback.** `sourceDiscovery.js` Pass 4 runs
inside Pipeline 3 (yes — it's a feedback loop). Mines venue URLs from
events extracted from Tier-A/B aggregator sources. Promotes a host
when:

- ≥ 2 distinct aggregators mentioned it, OR
- 1 aggregator mentioned it AND the host name doesn't trip the
  singular-event filter (festival/fest/expo/marathon/gala/parade with
  count = 1 distinct title)

Promoted sources go directly into `sources` with `source_type='venue'`,
`source_tier='C'`, `active=false` until validated. Non-promoted
candidates write to `source_suggestions` for admin review.

In practice today this provides ~12-18 new sources/month with zero
manual effort.

### 3.2 Stage 1B — Validation (built 2026-05-11)

Probes a URL before / shortly after it lands in `sources` to confirm
it's worth scraping and recommend the right extractor strategy.
Operator clicks a "probe" button in `/admin#sources`; validation also
runs on demand for arbitrary URLs (pre-add diagnostic).

**Four probes** — `services/validationProbe.js`:

1. **HTTP** — `axios.get` with 15s timeout, 5 redirects, captures status,
   content-type, body size, final URL, elapsed_ms. Errors caught with
   network-error code rather than throwing.
2. **Render** — heuristic SPA detection. Strips scripts, counts visible
   text length, computes script-byte ratio. Markers: `<div id="root">`,
   `__NEXT_DATA__`, `window.__NUXT__`, `ng-app`. SPA shell verdict =
   text < 2000 chars AND script ratio > 50% AND a known shell marker.
3. **Structured** — counts JSON-LD `@type=Event` blocks, microdata
   `itemtype=…/Event` blocks, Open Graph meta tags, and Tribe Events
   Calendar markers.
4. **Yield** — actually runs the dispatcher. Generic primitives first
   (which honors any existing `extractor_config`). If primitives yield
   zero, falls back to a cheap Haiku call (max_tokens=1500, body
   capped at 4K chars, ~$0.001/probe) that just counts event-like rows
   and returns up to 3 sample titles.

**Recommendation logic** maps probe results to one of:

| Recommendation | When | Next step |
|---|---|---|
| `blocked` | HTTP error, 4xx, 5xx, or non-HTML content-type | Add to `BLOCKED_SITES` → web-search route |
| `needs-headless` | SPA shell detected (thin text, dominant scripts, framework marker) | Web search now; headless browser later |
| `no-events` | Loaded fine but no event-like content found | Check URL — wrong page, or source is currently empty |
| `auto-jsonld` | ≥ 1 JSON-LD `@type=Event` block | No config needed; generic primitive handles it |
| `auto-microdata` | ≥ 1 microdata Event itemscope | Generic primitive handles it |
| `auto-tribe` | Tribe Events Calendar markup | Generic primitive handles it |
| `auto-<primitive>` | Generic dispatcher already yielded events | No config needed |
| `needs-declarative` | Haiku found 1-2 events but no structured markers | Author a declarative `extractor_config` (Pipeline 1 D2) |
| `haiku-only` | Haiku found ≥ 3 events, no structure | Editorial roundup — Haiku is the only path |

**Storage:** results go to `sources.validation_status` /
`validation_at` / `validation_report` JSONB. Status is one of
`pending` / `validated` / `failed`. The full probe report is preserved
so the operator can re-read it without re-running probes.

**Endpoints:**

```
POST /api/admin/sources/:id/validate       run probes, save to row, return report
POST /api/admin/sources/validate-url       body: { url } — diagnostic for pre-add candidates
```

**UX:** every row in `/admin#sources` gets a `probe` button. After the
probe runs (~3-5s for HTTP + render + structured + Haiku), the button
becomes a status badge showing `validated · auto-jsonld` (or whatever
the recommendation is). Click the badge to open a modal with the full
probe breakdown and a recommended next step for the operator.

**v1 is advisory, not gating.** New admin-added sources still land with
`active=true` and immediately flow into Pipeline 3. A later iteration
will flip new sources to `active=false` until validation passes — but
the existing behavior is preserved for now so legacy add workflows
don't break.

### 3.3 Stage 1C — Categorization

> **Status:** manual today; admin enters `source_type`, `source_tier`,
> `category_hint` at add time.

Future: derive from the validation probe. If the page is a single
venue with one address visible across all events → `source_type='venue'`.
If events span ≥ 5 different venues → `source_type='aggregator'`. If
the article URL pattern matches editorial publication patterns →
`source_type='editorial'`.

`source_tier` follows source_type plus regex-matched authority signal
(WaPo / Washingtonian → A, DCist / Eater / Time Out → B, default C).

`category_hint` from URL path (`/things-to-do/` → mixed; `/concerts/`
→ music; `/galleries/` → arts).

### 3.4 Stage 1D — Custom Extractor Authoring

> **Status:** one custom function exists (`parseSmithsonian`). The path
> to scale: LLM-aided authoring + a declarative DSL for the easy 60%.

Three authoring tiers, in order of automation:

**D1. Generic primitives (no code).**
For sources with clean JSON-LD, microdata, or Tribe Events Calendar
markup, just configure `siteParsers.js` with `primitives:
['jsonLd', 'microdata', 'tribe']`. The first one to find ≥ 1 event
wins. Plus optional `defaults: { venue, neighborhood }` to fill blanks.
Already the path for ~50 sources.

**D2. Declarative config (extractor_config JSONB) — built 2026-05-10.**
For sources with structured but non-schema HTML (repeating
`<article class="event-card">` blocks, etc.). Operator authors a JSONB
config; generic engine in `services/declarativeParser.js` applies the
selectors via cheerio. ~80% of single-venue sources should fit this
pattern.

**Full schema:**

```json
{
  "container": "div.event-card",
  "fields": {
    "title": "h3.event-title",
    "venue": ".venue-name",
    "start_date": { "selector": ".date", "transform": "parseDate" },
    "start_time": { "selector": ".time", "transform": "parseTime" },
    "cost_display": { "selector": ".price", "transform": "parseCost" },
    "url": { "selector": "a", "attr": "href", "absolute": true },
    "description": ".event-blurb",
    "image_url": { "selector": "img", "attr": "src", "absolute": true }
  },
  "defaults": {
    "venue": "Mosaic District",
    "neighborhood": "Merrifield",
    "categories": ["food"]
  },
  "drop_if_missing": ["title", "start_date"]
}
```

**Field spec options:**

| Option | Effect |
|---|---|
| `selector` | CSS selector applied within the container element. Required. |
| `attr: "href"` | Pull an attribute instead of element text |
| `html: true` | Pull innerHTML instead of text |
| `absolute: true` | Resolve relative URLs against the source URL |
| `transform: "name"` | Run a named transform on the extracted string |
| `format: "..."` | Optional argument to the transform (e.g. date format hint) |
| `regex: "..."` | Apply regex capture group after extraction |
| `fallback: "..."` | Use this string when selector finds nothing |

**Transform library** (in `services/declarativeParser.js`):

| Transform | Input → Output |
|---|---|
| `parseDate` | "May 9, 2026" / "5/9/2026" / "May 9" → `2026-05-09` |
| `parseTime` | "8pm" / "20:00" / "7:30 PM" → `8:00 PM` / `2:30 PM` |
| `parseCost` | "$15-$45" / "Free" / "$15+" → `$15–$45` / `Free` / `$15+` |
| `trim` | Strips whitespace |
| `lowercase` / `uppercase` | Case shift |
| `slice:N` | First N chars (e.g. `slice:200`) |

**Defaults** apply when the field is null after extraction. Useful for
single-venue sources where venue/neighborhood are structurally fixed.

**`drop_if_missing`** rejects rows lacking any listed field after
extraction + defaults. Defaults to `["title"]` when not specified.

**Authoring workflow:**

1. Open `/admin#sources`, click "+ add" or "✓ edit" on a row.
2. Modal opens with the JSON config editor on the left, a live preview
   panel on the right.
3. Edit the config. Click "▶ Test against source URL" — backend fetches
   the live HTML, runs your config, returns the events that would be
   extracted.
4. Iterate selectors until the preview shows the right rows. The
   preview shows `matched_containers`, `emitted`, `dropped` counts so
   you can see when `drop_if_missing` is rejecting rows.
5. Click "💾 Save config" to persist to `sources.extractor_config`.
6. Next pipeline run uses the declarative path automatically. Falls
   back to generic primitives + Haiku if the declarative pass yields
   zero events (selectors broke).

**Endpoints:**

```
POST /api/admin/sources/test-extractor
     body: { sourceId? | url?, config }
     → { ok, matched_containers, emitted, dropped, events, fetch_ms, parse_ms }

PATCH /api/admin/sources/:id
     body: { extractor_config?, name?, url?, source_tier?, active?, ... }
     → { ok, source }
```

The dispatcher in `siteParsers.js` runs declarative FIRST when
`extractor_config` is non-null. If declarative emits zero events, the
generic primitive loop (`jsonLd`, `microdata`, `tribe`, `articleList`)
still runs — adding capacity without adding fragility.

**D3. Hand-written / LLM-authored function.**
For sources with weird structure or anti-scraping. `siteParsers.js`
exports a function. LLM-authored workflow: feed Claude the page HTML +
a few example desired-output rows, ask it to write a parser, run
against the test cases, iterate.

Validation step is mandatory: each custom parser ships with a fixture
HTML file and 1-3 expected event objects. Pipeline 2 re-runs these
fixtures daily to catch parser drift.

### 3.5 Stage 1E — Activation

Once the custom extractor passes its fixtures, flip `active=true`. The
next Pipeline 3 cycle picks it up. Source enters production.

---

## 4. Pipeline 2 — Health & Maintenance

> **Cadence:** daily cron.
> **Status:** mostly unbuilt. `consecutive_empty_runs` exists but
> nothing currently flips `active=false` on it. `last_error` is
> populated but not surfaced for diagnosis.
> **Goal:** detect drift before it becomes a feed-empty incident.

### 4.1 Stage 2A — HTTP probe

For each `active=true` source, do a lightweight HEAD/GET. Record:

- Status code
- Response time (p50/p99)
- Content-type
- Approximate response size (chars after htmlToText)

Compare to baseline (rolling 7-day median). Flag deviations:

- Status went from 200 → 403/404/429 → `parser_health = 'broken'`
- Response size dropped > 50% → `parser_health = 'drifted'`
- Content-type changed from `text/html` to `application/json` (site
  rebuild) → `parser_health = 'drifted'`

### 4.2 Stage 2B — Structure-drift detection (built 2026-05-10)

Each fixture is a frozen pair of (HTML, expected_events) saved when the
parser was known-good. Drift detection re-runs the CURRENT parser
against the SAVED HTML and compares to the fixture's `expected_events`.
Catches two failure modes:

1. **Parser drift** — operator edited the extractor_config, broke a
   selector, didn't notice. Replay says "current parser produces 0
   events from saved HTML" → broken.
2. **Site drift** — separately, the operator captures a NEW fixture
   from the LIVE URL once a week. If the parser now produces fewer
   events from current HTML than from the previous week's HTML, the
   site changed. The week-over-week capture+compare lives in the
   `/cron/parser-drift` cron loop (replays the most-recent fixture
   per source).

Verdicts written to `source_fixtures.last_replay_status`:

| Status | Meaning |
|---|---|
| `passed` | Current parser yields ≥ 50% of fixture's count AND ≥ 50% of fixture rows have matching (title + start_date) signatures in the new output. |
| `drifted` | Count dropped > 50% OR signature overlap < 50%. |
| `broken` | Current parser returned 0 events; fixture had > 0. |
| `no-baseline` | Fixture had 0 events when captured (probably a bad capture). |

Pipeline 2 health classifier reads the most-recent fixture's status
per source as the highest-priority signal — `broken` and `drifted`
verdicts override yield-based rules. So a parser drift detected
overnight surfaces as `parser_health = 'broken'` in the next health
check, before the user sees a thin feed.

**Endpoints:**

```
POST /api/admin/sources/:id/fixtures/capture     body: { label? }
GET  /api/admin/sources/:id/fixtures
POST /api/admin/fixtures/:id/replay
DELETE /api/admin/fixtures/:id
GET  /api/cron/parser-drift                       cron entry; replays one
                                                  fixture per source.
POST /api/cron/parser-drift
```

**UX:** the Fixtures section lives at the bottom-right of the
ExtractorEditor modal in `/admin#sources`. After saving a config and
verifying with Test, click 📸 **Capture fixture** to freeze the current
HTML + extracted events as the baseline. Per-fixture row shows replay
status (green/amber/red dot) with timestamp; ↻ replays one, ✕ deletes.

### 4.3 Stage 2C — Yield monitoring

Rolling 7-day count of events extracted per source. Compare to the
prior 7-day window. Flag:

- Yield dropped from N to 0 → `parser_health = 'broken'`
- Yield dropped > 50% → `parser_health = 'drifted'`
- Yield is flat-zero for ≥ 14 days AND source was previously producing
  → eligible for auto-pause review

### 4.4 Stage 2D — Triage

A nightly summary email/dashboard:

```
Pipeline 2 health report — 2026-05-10
─────────────────────────────────────
broken (3):
  - Round House Theatre        last_ok 2026-04-20, 403 since 2026-04-22
  - Bowl America Falls Church  last_ok 2026-03-15, parser drift
  - Pearl Street Warehouse     last_ok 2026-04-30, redirect loop

drifted (5): ...
healthy (158): no action needed
```

Operator reviews `broken` list daily, decides for each:
- Re-onboard via Pipeline 1 (URL changed, parser needs update)
- Auto-pause (`active=false`) if site is gone
- Defer if temporary (Cloudflare flap, holiday closure)

### 4.5 Stage 2E — Logic update path

When a custom parser is broken, drop it back into Pipeline 1 stage 1D
(custom-extractor authoring) for revision. The fixture is updated with
the new HTML; the parser is rewritten; the new version ships and
Pipeline 2 verifies on the next cycle.

---

## 5. Pipeline 3 — Runtime

> **Cadence:** every 1-4 hours (configurable per cron schedule).
> **Status:** fully built. This is what's running today.
> **Constraint:** must be cheap and idempotent. Re-running against
> same input → same output (modulo Haiku non-determinism).

```
sources (active=true) → SCRAPE → scraped_content
                                     │
                                     ▼
                                 EXTRACT
                              ┌─────┴─────┐
                              ▼           ▼
                          custom        Haiku fallback
                          extractor     (when extractor='haiku' OR
                              │          custom failed)
                              └─────┬─────┘
                                    ▼
                                events (raw)
                                    │
                                    ▼
                                BACKFILL ─── 3 retries × 6h cooldown
                                    │
                                    ▼
                                 MERGE ── 3 bucketing strategies
                                    │
                                    ▼
                              events (canonical)
                                    │
                          ┌─────────┼─────────┐
                          ▼         ▼         ▼
                        feed     telemetry   discovery
                                              (→ Pipeline 1)
```

### 5.1 Stage 3A — Scrape

Three strategies, ordered by cost:

```
isBlocked(source) ── yes ──▶ webSearchScrape (Haiku web_search tool)
       │                         │
       no                        ▼
       ▼                    return null on apology
   directScrape          ── fail ──▶ webSearchScrape
       │
       success
       ▼
   ┌── parsedEvents (from custom extractor; primary path soon)
   └── text (cleaned for Haiku fallback)
```

`isBlocked` is a manual allowlist of 65+ sources known to be JS-rendered
SPAs or Cloudflare-protected. Direct HTTP returns either a JS shell or
a 403, so we skip the futile attempt and route straight to web search.

`directScrape`:
1. `axios.get` with 12s timeout, 3 retries (0/1.2s/3.5s backoff).
2. HTML → JSON-LD events + structured hints (OG meta, microdata,
   `<address>`, `<time>`).
3. Per-site parser if `extractor` column says `custom:<fn_name>`.
4. `htmlToText` for the Haiku fallback path. Capped at 40K chars
   (15K with JSON-LD; structured data is canonical).

Output: `{ text, parsedEvents }` where `parsedEvents` is non-null when
a custom parser yielded ≥ 1 event.

`webSearchScrape`: Anthropic Haiku with the `web_search_20250305` tool.
Per-source query template in `getWebSearchQuery(source, dateRange)`.
Strong queries use `site:venue.com OR site:ticketmaster.com` hints +
ticket/show keywords.

Stage 3A writes one `scraped_content` row per source per pass with 25h
TTL.

### 5.2 Stage 3B — Extract

**Primary path: custom extractor.** When `parsedEvents` is populated
from the per-site parser, those rows go directly into events with
zero LLM involvement.

**Fallback path: Haiku.** When parser yielded nothing, send `text` to
Haiku with the cached static rules. Used today for 90%+ of sources;
target after the custom-extractor build-out is < 30%.

Haiku call:
- `STATIC_EXTRACTION_RULES` (~1.5K tokens, prompt-cached, ~95% hit rate)
- Dynamic context: source name, weekend dates, raw text
- `max_tokens: 8000` (raised from 3000 on 2026-05-10 to fit 27-item
  listicles; 3000 was truncating mid-array)
- Returns JSON array of events

Output processing per event:
1. Title normalization (`normalizeTitleForHash`) — strip promotional
   prefixes ("Spotlight:", "Throwback:") and trailing qualifiers.
2. `contentHash` = MD5(`normalized_title + '::' + (recurring ?
   'recurring' : start_date)`). Venue intentionally excluded.
3. `calculateBaseScore` from completeness + tier + confidence + venue
   keyword.
4. `expires_at` = end_date 23:59:59 OR start_date 23:59:59 OR NOW + 30d.
5. UPSERT with `ON CONFLICT (content_hash) DO UPDATE` that prefers
   non-null fields, picks longer descriptions, makes `is_recurring`
   monotonic, takes `GREATEST(base_score)`.

### 5.3 Stage 3C — Backfill

Decoupled queue model (see SCRAPING_PIPELINE prior version §6 for
full mechanics — unchanged):

- Per-event `backfill_attempts` + `backfill_last_at` columns
- 3 attempts × 6h cooldown
- Honors source's `field_contract.never_provides` to skip search calls
- Last-resort drop only when all 3 attempts exhausted AND missing all
  of (venue, date, url)

Triggered as Pass 2 inside `runExtractionPass` AND independently via
`POST /api/cron/backfill`.

### 5.4 Stage 3D — Merge

Three bucketing strategies in `mergeDuplicateEvents`:

1. **Ticket URL bucket** (`tk::canonical_url::date`) — same ticket
   page = same event by definition.
2. **Venue+date+time bucket** (`vts::venue::date::time`) — strong, but
   needs title-similarity guard (multiplex problem).
3. **Venue-only bucket** (`v::venue`) — weakest. For recurring weekly
   events that lack start_time. Gated by title similarity AND (21-day
   window OR is_recurring).

Winner is richest row by field-completeness score. COALESCE losers'
fields into winner. DELETE losers.

### 5.5 Stage 3E — Telemetry + feedback

After merge:
- Write per-pipeline-run heartbeat + finish-marker rows to
  `pipeline_telemetry_v2`.
- Update sources' `last_extracted_weekend`, `last_extracted_hash`,
  `last_ok`, `last_error`, `consecutive_empty_runs`.
- Run `sourceDiscovery.js` Pass 4 → feeds back into Pipeline 1 stage
  1A (auto-promotion or `source_suggestions`).

---

## 6. Custom Extractors — Patterns and Authoring

> The biggest unbuilt piece. Today only Smithsonian Associates has a
> hand-written parser. Target: ~80% of sources have either a generic
> primitive that works cleanly OR a custom extractor.

### 6.1 When to use which tier

| Source pattern | Extraction tier |
|---|---|
| Has clean schema.org/Event JSON-LD | D1 generic (`jsonLd`) |
| Has microdata `itemscope` blocks | D1 generic (`microdata`) |
| WordPress + Tribe Events Calendar | D1 generic (`tribe`) |
| Repeating `<article class="event-card">` style | D2 declarative |
| Custom HTML, consistent structure | D3 hand-written / LLM-authored |
| Editorial roundup (varies week to week) | Haiku fallback |
| Listicle ("X Things to Do") | Haiku + rule 0e expansion |

### 6.2 Hand-written example: Smithsonian

`parseSmithsonian(html, sourceUrl)` in `siteParsers.js` reads
Smithsonian Associates' specific repeating block structure:

- Each event lives in a `<div class="program-listing">` block
- Title in `<h3>`, date in `<span class="program-date">`
- Cost in `<span class="program-price">`
- Venue is always "Smithsonian" (filled by source defaults)

~100 lines of JavaScript. Brittle to redesigns. Pipeline 2 fixture
catches drift the day it happens.

### 6.3 Declarative DSL example (target state)

Hypothetical config for a similar source, no code:

```json
{
  "extractor": "auto:declarative",
  "extractor_config": {
    "container": "div.program-listing",
    "fields": {
      "title": "h3",
      "start_date": {
        "selector": "span.program-date",
        "transform": "parseDate",
        "format": "MMMM D, YYYY"
      },
      "cost_display": "span.program-price",
      "url": { "selector": "a.program-link", "attr": "href", "absolute": true }
    },
    "defaults": { "venue": "Smithsonian", "neighborhood": "National Mall" }
  }
}
```

Generic engine reads the config, applies the selectors via cheerio,
runs the named transforms, fills in defaults. Operator updates the
selectors when the site changes — no JavaScript needed.

### 6.4 LLM-authored workflow

For sources where neither generic primitives nor a simple selector
config fits:

1. Save a fixture HTML file (`fixtures/<source>.html`).
2. Write expected output as JSON (`fixtures/<source>.expected.json`,
   1-3 example events).
3. Ask Claude: "given this HTML, write a JavaScript function
   `parse<Name>(html, sourceUrl)` that returns the expected events."
4. Run the result against the fixture; iterate until it matches.
5. Commit the function + fixture + expected JSON.
6. Pipeline 2 daily fixture-replay catches drift.

This is the path for the 100+ long-tail single-venue sources that
don't have schema.org markup. Probably 20-30 minutes of human time
per source the first time, near-zero ongoing if the site is stable.

### 6.5 Fixture-driven testing

Every custom extractor (D2 + D3) ships with:

- `fixtures/<source>.html` — actual scraped HTML, frozen
- `fixtures/<source>.expected.json` — expected events array
- Test that runs the extractor against the fixture and asserts equality
  on title + start_date + venue (other fields tolerant)

Pipeline 2 replays these fixtures daily against today's HTML — if the
fixture passes against last-week's HTML but fails against today's, the
site changed. That's the signal to re-onboard.

---

## 7. Region/Distance Filter

(Unchanged from prior version. `distance.js` heuristic with
WRONG_REGION_TOKENS, STADIUM_DRIVE_MINUTES, CITY_DRIVE_MINUTES,
SOURCE_NAME_HINTS. Filter policy: ≤ 120min keep, > 120min hide unless
`base_score ≥ 0.85` headliner override.)

---

## 8. Heals (cross-cutting)

Run on boot and via `/api/cron/heal` (recommended every 2h). Order:

1. `healStaleEventExpiry` — deactivate where `expires_at < NOW()`
2. `healNullCategoryEvents` — set `category` from `categories[0]`
3. `healMissingVenuesFromSourceDefaults` — fill venue from per-source
   defaults (7 mappings)
4. `healMissingDatesForRecurringVenues` — pin recurring start_date to
   upcoming Sat/Sun
5. `healEventCategoriesToOption2` — legacy 21-bucket → 8-bucket remap
6. `healCategoriesByPattern` — venue-AGNOSTIC pattern recategorization
   (concerts → music, tours → trips, trivia → nightlife, races →
   outdoors, static-art → arts, indoor-leisure → nightlife)
7. `healArticleTitleEvents` — kill listicle headlines that slipped
   past rule 0e
8. `rotateSponsored` — keep 1 of 8 sponsored seeds active per week

Heals belong to Pipeline 3 in the sense that they run alongside
extraction, but they're cross-cutting — they touch rows from any
source.

---

## 9. Drop Points (where events vanish)

Diagnostic catalog. Useful for "why is the feed thin?" investigations.

### Pre-extraction
- HTTP timeout (12s × 3 retries with backoff)
- Web search apology detection
- 40K char text cap (15K with JSON-LD)
- JSON-LD events truncated to first 60

### Extraction
- Haiku output truncation (was 3000 max_tokens, now 8000)
- Cardinal Rule 0a (no crossed wires)
- Rule 0e (article-title rejection)
- Rule 5b (retail store events skip)
- Malformed JSON from Haiku
- Custom parser threw an exception → falls back to Haiku (no drop)

### Post-extraction
- `expires_at < NOW()` on insert (recurring events with past start_date
  land inactive)
- `content_hash` UPSERT collapses title+date duplicates
- `mergeDuplicateEvents` Pass 3 DELETEs loser rows
- Backfill drop: missing all of (venue, date, url) after 3 retries × 6h

### Filter / display
- Region/distance: `WRONG_REGION_TOKENS` → 999 → hidden. > 120 min +
  score < 0.85 → hidden.
- Frontend `isFrontendBlocked`: title=venue suppression + article-
  headline patterns

---

## 10. Configuration / Tuning Knobs

| Knob | File | Default | Effect |
|---|---|---|---|
| `SCRAPE_TIMEOUT` | scraper.js | 12000ms | Per-URL HTTP timeout |
| `MAX_CHARS` | scraper.js | 40000 | Cleaned text cap (15K with JSON-LD) |
| `BACKFILL_MAX` | extractor.js | 120 | Max events per backfill pass |
| `BACKFILL_MAX_ATTEMPTS` | extractor.js | 3 | Retry budget per event |
| `BACKFILL_COOLDOWN_HOURS` | extractor.js | 6 | Min wait between attempts |
| BATCH_SIZE (scraper) | scraper.js | 8 | Sources scraped in parallel |
| BATCH_SIZE (extractor) | extractor.js | 10 | Sources extracted in parallel |
| max_tokens extraction | extractor.js | 8000 | Haiku response budget |
| max_tokens web_search | scraper.js | 4000 | Haiku web_search response |
| max_tokens backfill | extractor.js | 600 | Haiku per-event backfill |
| Distance cap | distance.js | 120min | > cap hidden unless score ≥ 0.85 |
| Astronomical threshold | distance.js | 0.85 | Score that bypasses distance cap |
| `BLOCKED_SITES` | scraper.js | 65 entries | Sources that skip direct HTTP |

---

## 11. Telemetry

`pipeline_telemetry_v2` — heartbeat + finish-marker rows per run with
per-source success/fail/method, per-stage counts, durations. Surfaced
via `GET /api/admin/v2/telemetry` and `GET /api/admin/dashboard`.

**Pipeline 2 health report** (when built) should produce:
- Per-source `parser_health` ENUM
- Per-source 7-day yield delta
- Top 10 broken / drifted sources for triage
- Median time to recover (broken → healthy)

Coverage report at `GET /api/admin/sources/coverage`. Healthy ratio
target: producing > 50% of active.

---

## 12. Costs

Per Pipeline 3 run (typical ~166 sources):

- Scrape stage: ~30 web_search calls × $0.01 = $0.30
- Extract stage: ~100 Haiku calls × $0.005 = $0.50 (heavy cache-hit)
- Backfill stage: ~30 web_search calls × $0.01 = $0.30
- **Per run: ~$1.10**
- **Per day at 4 runs/day: ~$4.40**
- **Per month: ~$130**

After custom-extractor build-out (target: 30% Haiku use vs 90%
today), extract stage drops to ~$0.15/run, total ~$50/month.

Pipeline 2 daily fixture replay: ~$0.01/run × 60 sources × 1/day ≈
$18/month.

Pipeline 1 LLM-authored extractor sessions: bursty, ~$2-5 per new
source onboarded.

---

## 13. Failure Modes Quick Reference

| Symptom | Likely cause | Pipeline | Diagnose with |
|---|---|---|---|
| Feed empty for current weekend | Listicles correctly killed but per-item rows didn't materialize | 3 | Check `max_tokens`, prompt rule 0e |
| 88% sources never_produced | JS-rendered SPAs failing direct HTTP | 1 (validation) | `GET /admin/sources/coverage` |
| Same event 12× | content_hash drift across sources | 3 | `SELECT venue, COUNT(*) GROUP BY HAVING > 5` |
| Wrong region drift | Venue/address contains non-DC tokens | 3 | Check `WRONG_REGION_TOKENS` |
| All sources "All resolved URLs failed" | Render not redeployed OR scraper crashed | 3 | `MAX(scraped_at)` |
| Source went from 20 events/wk to 0 | Site redesigned, parser broke | 2 | Pipeline 2 fixture replay |
| Custom parser throws exception | HTML structure changed | 2 → 1D | Re-onboard with new fixture |
| Recurring event pinned to NEXT weekend | Date helper jumps forward on Sat/Sun | 3 | Check Sat → -1, Sun → -2 |

---

## 14. Glossary

- **Custom extractor:** A per-source function or declarative config
  that turns scraped HTML into events without LLM involvement.
- **Generic primitive:** A reusable extraction strategy (jsonLd,
  microdata, tribe, articleList) configured per source.
- **Fixture:** Saved HTML + expected output, used for parser tests
  and Pipeline 2 drift detection.
- **Content hash:** MD5 of normalized_title + date. Primary dedup key.
- **Pattern source:** A source whose canonical URL changes per issue.
- **Pre-parsed event:** Event extracted by custom or generic primitive
  before Haiku gets involved.
- **Listicle expansion:** Extract per-item rows from inside an
  aggregator article body, not the article's headline.
- **Spanning event:** start_date < target window but end_date >=
  target window. Ongoing run.
- **Headliner override:** Distance filter bypass for `base_score ≥
  0.85`.
- **Source contract:** Per-source `field_contract` JSONB declaring
  what fields it provides / never provides.
- **Parser drift:** Custom extractor's fixture passes last week's HTML
  but fails today's HTML.

---

## 15. Versions

- **2026-05-10:** Architecture restructured into three pipelines
  (Onboarding / Health / Runtime). Custom-extractor shift documented
  as the primary path going forward. Listicle expansion shipped
  (max_tokens 3000→8000, rule 0e flipped). **Pipeline 2 yield
  monitoring built** (parser_health columns, classify rules,
  /admin/sources/health endpoints). **Admin console at /admin built**
  (Health / Cron / Tables / SQL / Sources / Suggestions tabs;
  read-only SQL playground; whitelisted DB table viewer; gated to
  adamcrubin@gmail.com). **Declarative DSL built** (`extractor_config`
  JSONB column + `services/declarativeParser.js` engine + admin
  ExtractorEditor modal with live preview). **Fixture-based drift
  detection built** (`source_fixtures` table, `services/fixtureRunner.js`,
  cron + admin endpoints, drift signal feeds Pipeline 2 classifier as
  the highest-priority input, UI fixtures panel in ExtractorEditor).
- **2026-05-11:** Pipeline 1 stage 1B validation gate built
  (`services/validationProbe.js` runs HTTP + render-detect + structured-
  data + yield probes against any URL, returns a recommendation from a
  10-entry table). ValidationModal in `/admin#sources` surfaces the full
  probe breakdown + next-step copy. Advisory only; auto-gating new
  sources deferred until legacy add flows are migrated.
- **2026-04-30:** BLOCKED_SITES expanded 22 → 65; per-venue web-search
  queries tuned; admin sweep + coverage endpoints; Smithsonian arts-
  default removed; venue-agnostic categorization; pattern-based heal.
- **2026-04-29:** Persistent backfill queue (3 × 6h); cron-driven
  heals; per-source field contracts; embassies + cultural sources
  seeded; warmer endpoint; venue+activity merge bucket; is_recurring
  persistence + monotonic UPSERT.
- **2026-04-28:** V2 shadow pipeline; source self-discovery (Pass 4);
  Option-2 8-bucket categorization; article-title rejection (rule 0e);
  major venue keyword scoring boost.

---

## Appendix A — What's built vs. aspirational

| Pipeline | Stage | Status |
|---|---|---|
| 1 | 1A Discovery — admin add | ✅ built |
| 1 | 1A Discovery — boot seeds | ✅ built |
| 1 | 1A Discovery — auto-promotion | ✅ built |
| 1 | 1B Validation | ✅ built (2026-05-11) |
| 1 | 1C Categorization | ⚠️ manual |
| 1 | 1D Custom extractor — generic primitives | ✅ built |
| 1 | 1D Custom extractor — declarative DSL | ✅ built (2026-05-10) |
| 1 | 1D Custom extractor — hand-written | ⚠️ 1 source (Smithsonian) |
| 1 | 1D Custom extractor — LLM-authored workflow | ❌ not built |
| 1 | 1E Activation | ⚠️ manual |
| 2 | 2A HTTP probe | ❌ stub |
| 2 | 2B Structure-drift (fixture replay) | ✅ built (2026-05-10) |
| 2 | 2C Yield monitoring | ✅ built (2026-05-10) |
| 2 | 2D Triage report | ✅ built (2026-05-10) |
| 2 | 2E Logic update path | ⚠️ manual (operator reviews triage, kicks back to Pipeline 1) |
| 3 | 3A Scrape | ✅ built |
| 3 | 3B Extract — Haiku | ✅ built |
| 3 | 3B Extract — custom primary | ⚠️ 1 source |
| 3 | 3C Backfill | ✅ built |
| 3 | 3D Merge | ✅ built |
| 3 | 3E Telemetry + feedback | ✅ built |

### Pipeline 2 yield monitoring (2026-05-10 build)

`services/sourceHealth.js` runs the daily probe. Endpoints:

```
GET  /api/cron/source-health        run + return triage
GET  /api/admin/sources/health      cached view of parser_health
GET  /api/admin/sources/health.txt  human-readable triage report
```

Schema additions to `sources`:

- `parser_health TEXT DEFAULT 'unknown'` — healthy/drifted/broken/unknown
- `parser_health_at TIMESTAMPTZ` — when last computed
- `parser_health_reason TEXT` — short diagnosis string

Classification rules (in `classify()`, first match wins):

1. `total_events == 0 && age_days < 7` → `unknown` (too new)
2. `total_events == 0 && catastrophic last_error` → `broken`
3. `total_events == 0` → `broken` (tried but never produced)
4. `catastrophic last_error` (403/404/All resolved URLs failed/DNS/SSL) → `broken`
5. `events_30d == 0 && total_events > 0` → `broken` (long dormancy)
6. `events_7d_prior >= 3 && events_7d < events_7d_prior * 0.5` → `drifted` (yield drop)
7. `events_7d == 0 && events_7d_prior > 0` → `drifted` (just-stopped)
8. `events_7d == 0 && events_7d_prior == 0 && events_30d > 0` → `drifted` (two-week silence)
9. `last_error && events_7d > 0` → `drifted` (minor errors with flow)
10. otherwise → `healthy`

Auto-pause is intentionally deferred. The triage list is operator-reviewed.

The build-out priority order (highest ROI first):

1. **Pipeline 2 stage 2C yield monitoring + 2D triage** — surface broken
   sources daily so we don't discover them via empty feeds.
2. **Pipeline 1 stage 1D2 declarative DSL** — unlocks fast onboarding
   for the long-tail single-venue sources.
3. **Pipeline 2 stage 2B fixture-based drift detection** — catches
   parser breaks on the day they happen.
4. **Pipeline 1 stage 1B validation** — gates new sources before they
   land in production.
5. **Pipeline 1 stage 1D3 LLM-authored workflow** — for sources too
   weird for the DSL.
