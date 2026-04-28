# Locale — Product Roadmap & Ideas
*Last updated: April 2026*

---

## Current State (v0.5 — April 2026)

**Working:**
- ✅ Live event feed from ~75 sources (Falls Church VA / 22046)
- ✅ Haiku-powered event extraction with 14 categories
- ✅ Relevancy scoring (profile prefs + weather + confidence)
- ✅ 4-column paginated desktop layout with arrow nav
- ✅ Google Calendar OAuth + "Add to Calendar" from any event
- ✅ Weekend sidebar: top pick + Fri/Sat/Sun calendar + weather
- ✅ Quick AI prompts (Plan my Saturday, Date night, etc.)
- ✅ Free-text Ask Claude chat
- ✅ Pipeline status indicator (pulsing amber dot)
- ✅ Ambient mode (screensaver photo slideshow)
- ✅ Multiple themes (Hearthside, Parchment, Terminal, Neon, Brutalist)
- ✅ Profiles with category states (always/sometimes/never) + preferences
- ✅ Curated mode (max 5 per category)
- ✅ Share events (native + web)
- ✅ localStorage caching (5min TTL, instant repeat loads)
- ✅ Ticket URL support (🎟 button on ticketed shows)
- ✅ Music genre badges on cards
- ✅ Feedback (👍👎) wired to backend

**Known gaps:**
- ⚠️ ~70-90 events (want 150+)
- ⚠️ Many events still missing time/date in subheader
- ⚠️ Render free tier = cold start lag on first daily load
- ⚠️ Only Falls Church VA supported (22046)
- ⚠️ No push notifications / reminders
- ⚠️ No social / sharing between users
- ⚠️ Weeknight mode underbuilt

---

## Near-Term (Next 2-4 Weeks)

### 🔐 Security — RLS Policies

Supabase advisor is flagging tables with RLS enabled but no policies defined
(the default "locked except via service_role" state). Backend works fine because
it uses the service-role key, but we should author explicit policies so the
data model documents who's allowed to read/write what.

- [ ] **Audit current RLS state** — run `get_advisors type='security'` to pull
  the full list (tables with RLS-disabled + tables with RLS-on-no-policies)
- [ ] **`profile_events` / `user_preferences` / `household_settings` / `google_tokens`**
  — owner-only read/write. Policy: `auth.uid()::text = user_id`
- [ ] **`sources` / `events` / `evergreen_events` / `scraped_content`**
  — public read, service-role write. Policy: `USING (true)` for SELECT; writes
  only happen server-side so no client INSERT/UPDATE policy needed
- [ ] **`source_suggestions` / `event_sources` / `profile_recommendations`**
  — currently RLS-disabled; turn on + add service-role-only policy
- [ ] **`friendships` (when it ships)** — already specified in FRIENDS_DESIGN.md:
  visible if `auth.uid() IN (requester_id, addressee_id)`

Not urgent while the app is invite-only, but the advisor warning won't go away
until policies exist — and before any client library starts talking to Supabase
directly (bypassing the Node backend), this has to be in place.

### 🔧 Data Quality — Priority #1

The biggest UX problem: events with missing time/date/venue data look broken.

- [ ] **Run source health check** — identify which sources produce 0 events consistently → disable or replace them
- [ ] **Re-scrape with improved FXVA routing** — FXVA now uses web search; should produce real Fairfax events with full data
- [ ] **Extraction prompt: tighter time extraction** — add explicit rule: "if a time appears near the event title (within 3 lines), always capture it"
- [ ] **Add Mosaic District Events** as a source ✅ (done April 2026)
- [ ] **Manual review of all 75 sources** — check which ones are actually producing events in the DB
- [ ] **when_display fallback improvement** — if no time, set when_display = "This weekend" instead of null, so it always shows something

### 📦 Event Volume — Get to 150+ Events

Current: ~70-90. Target: 150+.

- [ ] **Add recurring sources per category** — each category should have 3-5 dedicated sources
  - Film: add Fandango showtimes search
  - Sports: add Capitals, Wizards, Mystics schedules
  - Comedy: add more NoVA comedy clubs
  - Wellness: add more yoga studios
- [ ] **Tune extraction to be less strict** — some real events are being filtered by BLOCKLIST; audit what's being skipped
- [ ] **Increase extraction context** — some sources get cut off at 8000 chars; add smart truncation that prioritizes event-dense sections
- [ ] **Evergreen events** — add 20-30 always-available venues/activities as evergreens that fill columns when event count is low

### 🎨 UI Polish

- [ ] **Better "no events" state** — when a category has <2 events, show a helpful message + search suggestion
- [ ] **Event confidence indicator** — subtle "?" badge on events where confidence='inferred'
- [ ] **Faster pipeline feedback** — show progress (e.g. "Scraped 23/75 sources...")
- [ ] **Mobile layout** — swipe gestures need testing; single-column view needs UX love
- [ ] **Loading skeletons** — replace mock data placeholder with proper skeleton cards

---

## Medium-Term (1-3 Months)

### 🌍 Multi-City / Zip Code Support

The app is currently hardcoded to Falls Church VA (22046). Expanding to any zip:

- [ ] **City picker UI** — settings or onboarding lets you set city + zip
- [ ] **Source discovery agent** — automated workflow to onboard 30-60 sources for any new city (see `SOURCE_DISCOVERY_STRATEGY.md`)
- [ ] **Initial cities**: DC (20001), Arlington VA (22201), Alexandria VA (22314), Bethesda MD (20814), Nashville, Austin, Chicago
- [ ] **Multi-home support** — profiles can have different "home" cities; useful for frequent travelers

### 📱 Mobile App (PWA First)

- [ ] **PWA manifest + service worker** — make it installable on iOS/Android home screen
- [ ] **Push notifications** — "3 events happening near you tomorrow — check your weekend"
- [ ] **Offline mode** — show last cached feed even without internet
- [ ] **Native share sheet** on iOS

### 🤖 Smarter AI Features

- [ ] **Itinerary builder** — "Plan my Saturday" returns a full day schedule, not just individual events. Claude builds a route: morning market → afternoon museum → evening concert.
- [ ] **Conflict detection** — when adding to Google Calendar, warn if it overlaps existing plans
- [ ] **Smart reminders** — "The event you saved starts in 2 hours"
- [ ] **Weekly brief email** — Friday morning: "Here's your weekend. 3 picks based on your taste."
- [ ] **Post-event feedback loop** — "Did you go to Holi at Mosaic? How was it?" → improves scoring

### 📅 Google Calendar Deeper Integration

- [ ] **Two-way sync** — pull existing calendar events and block them in the feed (don't suggest things you're already doing)
- [ ] **Smart time slotting** — "Add to Saturday morning" slots the event at the right time based on when_display
- [ ] **Shared calendar** — Adam and Kailee see each other's added events

---

## Long-Term (3-6 Months)

### 🏗 Platform / Infrastructure

- [ ] **Upgrade Render to paid** ($7/mo) — eliminates cold start entirely. This is the single highest-ROI infrastructure change.
- [ ] **Scheduled pipeline** — run scrape + extract every Thursday night (when sources update for the weekend)
- [ ] **Source health monitoring** — automatic alerts when sources go dead; auto-replacement via discovery agent
- [ ] **Event verification** — ping event URLs the day before to confirm they're still live
- [ ] **Database cleanup** — auto-expire events past their end_date; archive old scraped_content

### 👥 Multi-User / Sharing

- [ ] **Invite a friend** — share your profile (or a curated list) with someone
- [ ] **Couple mode** — two profiles merged into one feed (intersection of preferences)
- [ ] **"Who else is going"** — social layer: see if friends saved the same event

### 💰 Monetization (if ever)

Not the focus, but options:
- Affiliate commission on ticket sales (Ticketmaster, Eventbrite)
- Local business sponsorships ("Promoted by Mad Fox Brewing")
- Premium tier: more cities, Sonnet-powered itineraries, weekly email brief

---

## Feature Backlog (Unordered Ideas)

### Events & Discovery
- [ ] Filter by cost (free events only toggle)
- [ ] Filter by time of day (morning / afternoon / evening)
- [ ] "Surprise me" — random high-scored event from a random category
- [ ] Recurring events tracking (e.g. "farmers market every Saturday")
- [ ] Event ratings / community reviews
- [ ] Search within the feed
- [ ] Venue profiles — "everything at Wolf Trap this month"

### Planning
- [ ] Parking / transit info attached to event (Google Maps embed)
- [ ] "Similar events" — tap an event to see related options
- [ ] Pre-filled calendar event with all details (venue, description, directions link)
- [ ] Packing list / what to bring suggestions ("outdoor festival → sunscreen, cash")

### UI / Experience
- [ ] Dark mode (full dark, not just header)
- [ ] Compact view (tighter cards, fit more on screen)
- [ ] Event photos (pull from Unsplash or venue website)
- [ ] Map view — see all events plotted geographically
- [ ] Print-friendly weekly view (actual paper on the fridge)
- [ ] Keyboard shortcuts (j/k to navigate, enter to expand, c to add to calendar)
- [ ] Column drag-to-reorder

### Settings & Personalization
- [ ] "Blocked keywords" — user-defined blocklist
- [ ] Notification preferences (push, email, none)
- [ ] Budget range filter (free / $ / $$ / $$$)
- [ ] Distance filter (within 5mi / 15mi / anywhere)
- [ ] Hide specific sources

---

## Technical Debt

| Item | Priority | Effort |
|------|----------|--------|
| Replace mock ACTIVITIES with real skeleton | High | Low |
| Consolidate duplicate `formatWhen` logic in multiple files | Medium | Low |
| Source-level scrape stats dashboard | Medium | Medium |
| Unit tests for extractor/relevancy | Low | High |
| TypeScript migration | Low | Very high |
| Optimize relevancy.js (N+1 queries) | Medium | Medium |
| Cache invalidation on pipeline complete | Medium | Low |

---

## Architecture Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01 | Haiku for extraction, Sonnet for prompts | Cost: Haiku is 25x cheaper; quality acceptable for structured extraction |
| 2026-02 | Web search as fallback for blocked sites | Many high-value sources (WaPo, Ticketmaster) block bots; web search bypasses this |
| 2026-03 | Supabase instead of raw Postgres | Built-in auth, real-time, and easy token storage for Google OAuth |
| 2026-04 | localStorage cache (5min TTL) | Render free tier cold starts make uncached loads feel broken; stale-while-revalidate is the right UX |
| 2026-04 | profileId as Google OAuth userId | App has no auth layer; profileId ('default') is stable enough for token storage |
| 2026-04 | Categories: 14 types, removed 'miss' | 'miss' was confusing; new categories (breweries, comedy, film, wellness, family, markets) are cleaner |
| 2026-04-24 | Add virtual "Curated" category | Top-10 cross-category surfacing without duplicating storage; items remain discoverable in native category |
| 2026-04-24 | NWS `probabilityOfPrecipitation.value` for hourly precip | Regex on `shortForecast` was nearly always 0; the structured field is the actual precip chance |
| 2026-04-24 | Ticket URL specificity check (frontend) | Hide button when URL is a bare aggregator homepage — misleading UX worse than no button |

---

## Shipped 2026-04-24

- Curated category (top-10 across all cats, rendered first).
- Sports emoji tags (🏀 🏈 ⚽ 🏃 …) parallel to music-genre tag.
- Time filter relocated to top-left.
- "Ask Anything" unified into `QUICK_PROMPTS`.
- Mobile column duplication fix (`dedupeActivities` + `isFrontendBlocked` in `MobileLayout`).
- Ticket URL validation + Google `btnI=1` fallback for missing `act.url`.
- Hourly + daily precipitation now from `probabilityOfPrecipitation.value`.

## Critical Security/Reliability Debt (from 2026-04 scan — NOT shipped)

| Item | Severity | Notes |
|------|----------|-------|
| `/api/admin/*` has no auth | 🔴 Critical | Public endpoints allow trigger/cleanup/delete. Add shared-secret header or IP allowlist before any wider rollout. |
| `profileId='default'` IDOR on Google tokens | 🔴 Critical | Any caller can read/write another user's OAuth tokens. Must bind to Supabase `auth.uid()`. |
| No Supabase RLS evidence | 🟡 High | Service key in backend works around RLS; verify policies exist. |
| XSS in `/auth/google/callback` HTML response | 🟡 High | Any interpolated value should be HTML-escaped. |
| Open CORS | 🟡 Medium | Restrict to `FRONTEND_URL`. |
| `ActiveMode.jsx` 1574 lines | 🟡 Medium | Split into `CatColumn`, `MobileLayout`, `ActionBar`, helpers. |
| Weekend-date logic duplicated in 4 places | 🟡 Low | Extract to shared util. |
| Blocklist duplicated FE/BE | 🟡 Low | Ship from backend as config payload. |

---

## Shipped 2026-04-27 (data-quality round)

A round triggered by "Monday looks empty." Root cause was a single
`expires_at` bug compounded by an over-aggressive auto-pause policy and
a few smaller scoring/dedup gaps. Fixed end-to-end.

### Critical bug fixes

- **`expires_at` bug** — extractor was setting `expires_at` to "this
  weekend's Sunday" regardless of when the event actually was. Future-weekend
  events landed in the DB already-expired and got flagged inactive on the
  next pass. Of 26 upcoming rows, 16 had `expires_at < start_date`. Fixed:
  computed from `end_date`/`start_date`, and the ON CONFLICT clause now
  refreshes `expires_at` so re-extraction self-heals stale rows. Boot-time
  heal recomputes existing bad rows + reactivates them.

- **Auto-pause over-firing** — old rule (3 consecutive empty runs → pause)
  was nuking top-yielding sources after a single bad weekend. Washingtonian
  Weekly (50 lifetime events), WaPo Going Out Guide, Mosaic District,
  Birchmere — all paused. New rule: pause only after N *days* without
  extracting anything, where N scales by lifetime track record (14d for
  0–5 events, 30d for 6–20, 45d for 21+). Boot-time heal reactivates
  every source that was paused under the old strike rule.

- **Cross-source dedup** — `content_hash` was missing variants where
  promotional prefixes ("Throwback Night:", "Premiere:", "Featured:")
  hashed to different rows for the same event. Now stripped before
  hashing (category-agnostic). New post-extraction merge pass collapses
  what survives via `ticket_url + start_date` and `venue + start_date +
  start_time` keys; richest row wins, losers donate non-null fields.

### Scoring + filtering

- **Distance filter** — universal across categories. Hide events > 2h
  one-way drive from DC metro unless `base_score ≥ 0.85`. Three lookup
  layers: pro stadium names (Guaranteed Rate Field, Citi Field, Fenway,
  …), city/town names (Charlottesville, Gettysburg, Baltimore, NYC,
  Philly, …), source-name fallback. The `away` category isn't exempt —
  weekend-trip events still earn their slot via score.

- **Source tier data-driven** — new `sources.source_tier` column (A/B/C/D)
  drives the +0.15 / +0.08 / 0 / −0.05 base_score boost. Replaces the
  regex-on-name classifier as primary path; admin can promote/demote
  without a deploy. Hand-promotions: `washington.org Monthly`,
  `washington.org This Weekend`, `FXVA Fairfax Events` C → B.

- **`MAJOR_VENUE_KEYWORDS` audited** against actual `events.venue`
  strings. Added: AFI Silver, Torpedo Factory, Politics and Prose,
  Pearl Street Warehouse, Capital One Hall, Library of Congress, Studio
  Theatre, Olney Theatre, Shakespeare Theatre, Jiffy Lube Live,
  Merriweather, Mosaic District. Removed entries that never matched.

- **`weatherModifier`** picks the forecast day matching `start_date`
  (was always Saturday). Outdoor categories expanded to include `family`
  + `wellness` so a Sunday 5K or kid park festival reads its own day's
  weather.

- **`recencyMod` rebalance** — never-shown bumped +0.1 → +0.2 so it
  clearly outranks long-ago-shown (+0). Same fix on evergreens.

- **Title+date dedup nullsafe** — two unrelated null-date events with
  similar titles ("Trivia Night" at two breweries) no longer collapse
  via the synthetic `"::nd"` key.

### NULL-category healing

- **Smithsonian Associates lectures** were landing with `category=NULL`
  because the per-site parser bypassed Haiku's categorizer. Added
  `defaults.categories` support to the parser config (Smithsonian seeded
  as `['nerdy']`) and a boot-time heal that backfills existing NULL rows
  via a source-name → category map.

### Admin tools

- **`GET /api/admin-ui`** — single-page HTML dashboard, served unauth
  but token-gated for data fetches (sessionStorage-cached). Source
  health table with tier pills, lifetime/14d/days-idle counts, status
  pills, last-error text, inline reactivate + set-tier buttons. Top-row
  summary stats. Feed-stats panel showing per-category counts, score
  buckets, sample distance-hidden events.
- **`GET /api/admin/dashboard`** — JSON: per-source health.
- **`GET /api/admin/feed-stats`** — JSON: feed-level diagnostics.
- **`POST /api/admin/sources/:id/reactivate`** — manual unpause.
- **`POST /api/admin/sources/:id/tier`** — set source_tier.

### Sports legacy paths kept

The new `services/sports.js` direct-API path covers Nationals only
(MLB Stats API). Capitals, DC United, Spirit, WNBA, etc. still come
through the scrape pipeline — distance filter handles incorrect away
games. Legacy MLB scrape rows intentionally not deleted.

### checkSourceHealth bug

`events.created_at` doesn't exist (it's `extracted_at`); the zero-event
advisory query was throwing silently inside the catch and never wrote
the flag. One-line fix.

### Distance filter telemetry

`?showHidden=1` on `/api/events` keeps far-away events in the response,
tagged with `_distance_hidden`, `_distance_minutes`, `_distance_reason`
so an admin UI can surface "what's getting cut and why".

---

## Shipped 2026-04-25 (later session)

- **MLB Nationals schedule sync** — new `src/services/sports.js` pulls home games from the public MLB Stats API, dedupes via `content_hash`, upserts to `events` with proper `start_date`/`start_time`/category. Wired into nightly 3am cron via `syncAllSports()`. Admin trigger: `POST /admin/sync-sports`. (Capitals + DC United coming next — same scaffold.)
- **Bad evergreen cleanup** — deleted "Nationals game" / "Capitals + Wizards" / "DC United" entries from `evergreen_events` (sports games are time-bound, not evergreen).
- **User feedback collection** — new `user_feedback` Postgres table + `POST /api/feedback` (rate-limited, 4000-char cap, validated category) + `GET /admin/feedback` for triage. Frontend `SendFeedback.jsx` floating 💬 button + modal lands here. Categories: bug / idea / data / praise / other.
- **PostEventFeedback "Didn't go"** — added 4th option for users who skipped the event. Mapped to `down` server-side for now; could split later if signal warrants. Mobile layout uses `safe-area-inset-bottom` + flex-wrap to avoid being hidden by iOS chrome on narrow screens.
- **Sunday "next weekend" banner fix** — was firing Monday morning while "this weekend" had already auto-shifted, so it pointed users to a weekend they were already viewing. Now Sunday ≥3pm only.
- **Per-column ErrorBoundary** — new `SingleColumnBoundary` wraps each `<CatColumn>` / `<StackedColumn>` so a single bad event doesn't blank the entire feed. Outer boundary kept as catastrophic fallback.
- **Admin auth hardening** — replaced `req.headers !== secret` with `crypto.timingSafeEqual()` + per-IP rate limit (10 failed attempts/hour, 1-hour window). Successful requests don't count.
- **Performance**:
  - `CatColumn` filter chain wrapped in `useMemo` — was re-running `dedupe + 4 filters` on every keystroke in any sibling column.
  - `useWeekdayActivities` is now lazy — only fetches when `screen === 'weekday'`. Saves a 60-event payload for users who never open Weekday mode.
- **ESLint `no-use-before-define`** — added with `variables: true` to catch the temporal-dead-zone footgun (useEffect dep array referencing `const` declared further down in the same component → ReferenceError → blank screen). We hit this twice; now it's lint-blocked.
- **Auth path console.log strip** — gated the OAuth token log behind `NODE_ENV !== 'production'`.

## Shipped 2026-04-25

- **Demo-mode gating** — `LoginPromptModal` blocks writes/personalization for unauthenticated users; keeps browsing open. Profile avatar hidden; "Sign in" CTA shown in header.
- **Extractor cost optimizations**:
  - Prompt caching (`cache_control:ephemeral`) on ~1.5K-token static rules block
  - JSON-LD aware truncation: 40K → 15K when schema.org/Event preamble is present
  - `max_tokens` 8000 → 3000 (typical output ~1.5K; bounds worst case)
- **Source authority tier** added to `calculateBaseScore` (see DESIGN.md).
- **Hash-skip re-extraction** — per-source `last_extracted_hash` + `last_extracted_weekend` columns. If a new scrape's text hash matches prior and weekend hasn't rolled over, skip the Claude call entirely. Logs `N cache-skipped` at end of pass.
- **Auto-pause empty sources** — `consecutive_empty_runs` counter; at 3 strikes sets `active=false` + `auto_paused_at`; reset on any insert ≥ 1.
- **@anthropic-ai/sdk** bumped `^0.20.0` → `^0.91.0` so prompt-caching metadata serializes correctly.
- **DB bootstrap** — idempotent `ALTER TABLE ... IF NOT EXISTS` run from `testConnection()` on startup. No manual Supabase SQL needed.

## Still open (ordered)

1. ~~**Admin auth**~~ ✅ Shipped 2026-04-25 (later session) — `crypto.timingSafeEqual` + per-IP rate limit on `/api/admin/*`.
2. **Supabase RLS** — SQL migration to lock tables to `auth.uid()`; swap service-role key for user JWT in hot paths.
3. **Per-event zip + travel time** — add `event_zip`, `event_lat`, `event_lng`, `drive_minutes_from_user`. Phase 1: extract zip from address via Claude during extraction. Phase 2: static zip→zip drive-time table. Phase 3: Google Distance Matrix + cache.
4. **Evergreens seed table** — ~100 manually curated DC metro anytime options (museums, theaters, bowling, escape rooms, trails, etc.). Merge into feed at `base_score≈0.45`, filtered by weather (indoor/outdoor).
5. **Cross-source popularity boost** — if same `content_hash` appears in ≥3 sources, +0.10. Cheap: just count rows.
6. **Batch API** — Anthropic's batch API (50% off) for async extraction. Queue → poll. ~30-min refactor.
7. **Scrape frequency tuning** — add `scrape_frequency_hours`; high-yield sources daily, long-tail weekly.
8. **ActiveMode split** — file is ~1600 lines. See split plan in DESIGN.md. Started; not yet done.

---

## Shipped — May 2026 (the trust-and-data-quality round)

A round of beta testing surfaced five trust-killers; ~two weeks of work landed against them.

### Pipeline overhaul

- **Per-site HTML parsers** ([siteParsers.js](src/services/siteParsers.js)) — 4 generic primitives (`jsonLd`, `microdata`, `tribe`, `articleList`) + ~80 per-source configs. Bypasses the Haiku call entirely on covered sources. Mosaic District: 53 events, 100% venue/date/url, 3ms vs ~$0.04 + 10s of Haiku. See DATA_PIPELINE.md.
- **Three-tier venue system** in extractor — single-venue (Pinstripes, Kennedy Center, …), small navigable area (Falls Church, Mosaic District, Old Town Alexandria), aggregator (Smithsonian umbrella, NoVA Parks, Eventbrite). Aggregators leave venue/area null and head to backfill.
- **Multi-field web_search backfill resolver** in extractor — for any event still missing url/venue/date/neighborhood/description after primary extraction, ONE Haiku web_search call returns a JSON object with whatever it could verify on real source pages. Replaces the old "drop on missing field" approach. On current data: 0 events would be unsalvageable (down from 122 in the strict version).
- **Apology detection** in scraper — drops "I appreciate your request, but I can't use site:..." preambles before they pollute the extractor with mis-attributed venues.
- **Dedup overhaul** — `content_hash` now hashes title+date only (was title+venue+date). Smart UPSERT merges venue/url/desc from whichever source had the most complete row. Migration backfills + soft-deletes ~69 existing duplicates.
- **No-Google-fallback** — frontend `ActionBar` Open button hides entirely when there's no real URL. Pipeline drops events with no URL after backfill.
- **Meetup source removed** — too small/niche for the curated feed; web_search backfill blocked from re-introducing meetup.com URLs.
- **Parser health check** — new `POST /admin/parser-health` endpoint + `parser_health` table + weekly cron-ready monitor. Detects regressions when a site changes its HTML (events count went from N>0 to 0).

### UX

- **Spotlight strip** on first card of Curated column (violet, default-expanded). Now also rendering on mobile.
- **Sponsored events** — `is_sponsored` column + 8 self-serving seeds. Renders amber strip on card, sidebar slot on desktop, slot #2 in Curated on mobile.
- **View modes** — Compact / Standard / Magazine toggle in QuickPrompts row. localStorage-persisted.
- **Smart Open button** in ActionBar — replaces separate Link/Reserve/Ticket. Killed the heart Save button (thumbs-up + calendar-add cover both signals).
- **Friend-going pill** — `👥 N going` amber pill in the compact card title row.
- **Source transparency** behind a tiny ⓘ — was an always-visible footer; now click-to-reveal.
- **Loading splash split** — separate rows for progress (1.4s) and tips (5s). Tips dwell long enough to read.
- **Top-bar (i) menu** for About / Terms / Privacy / etc. Removed from Settings.
- **Empty category columns dropped** — was a hollow-feeling tail of "Music · 0", "Sports · 0".
- **GCal scope narrowed** to `calendar.events` (was full `calendar` — scarier consent screen).

### Cost optimizations

- **Why-blurb cache scope: per-event globally** (was per-event-per-profile). ~10× fewer Haiku calls for the same UX.
- Per-site parsers eliminate Haiku for covered sources — savings at scale.

### What I learned along the way

| Round | Insight |
|---|---|
| 1 | Most missing-venue events come from sources where the source NAME or URL HOST is itself the venue (e.g. `mosaicdistrict.com`, "Falls Church City Calendar"). |
| 2 | Stripping all HTML before extraction throws away rich signal. Microdata `itemprop="location"`, `<address>` blocks, `<time datetime="...">`, and `og:*` meta tags are now captured into a structured-hints preamble. |
| 3 | Web-search-backed scrapers sometimes return apology preambles with unrelated event dumps. Extractor mis-attributes venues from the soup. Drop those entirely at scrape time. |
| 4 | Aggregators (Smithsonian umbrella, NoVA Parks, Loudoun Wineries) have host-level ambiguity — "Smithsonian" covers Air & Space, NMAH, Hirshhorn, Portrait Gallery, all miles apart. The fix isn't to fill venue with the aggregator name — it's to NOT fill it, and let backfill resolve per-event. |
| 5 | Site HTML structure is stable for months. A 30-line per-site regex parser is free, deterministic, faster, and dodges Haiku failure modes. Maintenance: a weekly health check catches regressions. |

---

## Pending — needs Adam (none of this is in code, just config or SQL)

### SQL migrations queued (none yet applied)

Order doesn't matter; meetup before dedup is the only soft dependency. Paste each in the Supabase SQL editor:

1. [migrations/sponsored_events.sql](migrations/sponsored_events.sql) — adds `is_sponsored` boolean + 8 seeded sponsored events. Without this, the new mobile sponsored slot is empty.
2. [migrations/remove_meetup_source.sql](migrations/remove_meetup_source.sql) — disables the Meetup source row + soft-deletes existing meetup events.
3. [migrations/dedup_cleanup_round2.sql](migrations/dedup_cleanup_round2.sql) — collapses ~69 existing duplicate rows from the old venue-included content_hash. Backfills the winner with the best venue/url/desc from the losers.
4. [migrations/add_scraped_content_parsed_events.sql](migrations/add_scraped_content_parsed_events.sql) — adds `parsed_events JSONB` column so the per-site parser results survive across the scrape→extract gap. Pipeline tolerates the column being absent and warns.

### Google OAuth — custom client for "Locale" branding

Currently the Google consent screen says `Sign in to <supabase-ref>.supabase.co` because Supabase routes through their default shared OAuth client. To fix:

1. Google Cloud Console → create a project ("Locale")
2. APIs & Services → OAuth consent screen → External, app name "Locale", scopes include `calendar.events`
3. Credentials → Web application client → redirect URI = `https://<supabase-ref>.supabase.co/auth/v1/callback`. Copy Client ID + Secret.
4. Enable Google Calendar API in the Library
5. Supabase Dashboard → Auth → Providers → Google → paste Client ID + Secret

While "Testing" status, only test-user emails can sign in (max 100). Hit "Publish" when ready for general invitations.

### Affiliate revenue — env-gated, dormant

Restaurant reservation wrapping (CJ + OpenTable) is coded in `services/reservations.js`. Activates when CJ + OpenTable approval comes through and `OPENTABLE_AFFILIATE_URL_TEMPLATE` env var is set on Render. No code changes needed at activation time.

### Friends — auto-all mode

`FRIENDS_AUTO_ALL=true` (default) treats every Locale user as a friend (seed phase). Real invite flow is wired and visible in Settings. Flip to `false` server-side once the user count justifies it.

---

## Still open after May 2026 round

| Item | Notes |
|---|---|
| Apply 4 SQL migrations | Listed above. None yet run. |
| Custom Google OAuth client | Adam-side config. Code path correct. |
| iOS app | PWA install + push notifications; or Capacitor wrap of the web app. |
| Push notifications / weekly brief email | "Friday morning: here's your weekend." |
| More cities | Source-discovery agent + per-zip source seed. DC = the prototype. |
| RLS policies | Service-role key currently dominates. Fine for invite-only beta. |
| Render hot tier ($7/mo) | Eliminates cold start. Highest-ROI infra change. |
| Scheduled per-source frequency | High-yield daily, long-tail weekly. |
| Source-discovery agent | Automated onboarding for new cities. |
| Two-way Google Calendar sync | Block existing busy times in the feed. |

---

## Late-April 2026 batch (12 items from real-world testing)

The Sunday-night staleness, time-window confusion, and "Le Diplomate's
not on OpenTable" experience surfaced a 12-item punch list. Some shipped
inline (see commits below), some need design + decisions before code.

### ✅ Shipped same day

- **#1 Time-window selector** — Header pill row now has 4 windows: This
  weekend / Next weekend / Weeknights / This month, with mm/dd date
  ranges in the sub-label. Persists in localStorage. Backend
  `getEventFeed` accepts `timeWindow` param, computes the right date
  range, drops DOW restriction for `this-month`.
- **#3 Past events** — `isPastEvent()` rewritten to compare `start_date`
  / `end_date` against now instead of buggy day-of-week math. Old loop
  said "Sat events on Sunday" weren't past because indexes wrapped wrong;
  Saturday cards stuck around all of Sunday.
- **#4 Sunday-evening banner** — Sun ≥5 PM and Mon <12 PM gets a sky-blue
  banner reading "This weekend's winding down — peek at next weekend?"
  with a one-click switch to next-weekend. Suppressed when user is
  already viewing next-weekend or weeknights.
- **#5 City picker** — Areas now collapsed by default; click to toggle.
  Search auto-detects ZIP queries (3+ digits → exact-prefix match) vs
  name queries; prompt "N neighborhoods share ZIP X — pick yours" when
  a ZIP returns multiple. Auto-expands matching areas while searching.
- **#7 Evergreen icon** — `∞` glyph in the title row of cards that are
  always-available activities (no specific date) — captures
  `content_type='evergreen'` from backend plus a heuristic for time-bound
  entries flagged trips/away/outdoors with no `start_time`.

### Design needed (need Adam input before coding)

#### #2 + #6 — More events per category, less Sunday emptiness

The root of "thin categories on Sunday" is two problems compounding:

1. **Most sources only return THIS weekend's events** because the
   extractor prompt is week-scoped. So as the weekend passes, events
   age out and there's nothing forward-looking to fill in.
2. **Some categories are inherently thin** (Books, Theater, Comedy,
   Activities, Trips) — DC just doesn't have 8 events of each every
   single weekend.

Three options for #6 (5–7 per category target):

| Option | Pros | Cons |
|---|---|---|
| **A. Pull from more sources** | Most events; closest to ideal UX | Source ramp is open-ended; some categories will still be thin (Comedy, Theater) |
| **B. Cut category count, merge thin ones** | Predictable feed density; less to maintain | Loses some content classification value |
| **C. Beef up evergreens** (curated 100+ standing recs) | Backfill thin weekends; works retroactively | Same recs surface every week — risks becoming wallpaper |

Recommended: **C as immediate win**, then **A as ongoing** as we add
sources. Skip **B** unless a year of data shows certain categories are
permanently dead.

For #2 (sources only show current weekend) — extend the extractor's
weekend window to also accept "next 14 days" when a source's listing
includes future-dated entries. Most venue calendars (Birchmere, Wolf
Trap, AFI Silver, Kennedy Center) already publish 6+ weeks ahead — we
just throw it away. Per-site parsers can already capture this since
they're unconstrained by prompt.

#### #8 — Out-of-DC headliner pulls (Baltimore, Philly, Wilmington, NYC)

For day-trip + weekend-away categories: pull only **headliner** events
(SantaCon, Restaurant Week, Pride parade, festival weekends) from
nearby metros. Plan:

- New `metro_imports` source type — runs ONCE per week per metro.
- Per-metro source list: visitbaltimore.org events, visitphilly.com
  weekend, choosechicago.com (later), nycgo.com.
- Filter at extract time to "name-brand event" tier — multi-day
  festivals, parades, marathons. Skip individual venue listings.
- Tag categorically as `away` or `trips` based on drive time band.

#### #9 — Convention centers as sources

Walter E. Washington (DC), Baltimore Convention Center, Pennsylvania
Convention Center (Philly), Hampton Roads, Greater Richmond, etc.
Add as scrape sources. Most have public event calendars. Tag as
`shopping` (consumer expos), `nerdy` (conferences), or `away`/`trips`
depending on metro.

#### #10 — Sold-out detection before linking to tickets

Hardest of the batch. Most ticketing platforms don't expose sold-out
status without scraping the actual event page (JS-rendered, often).
Options:

- **Best-effort web search** at extract or feed-build time, asking
  Haiku "is this event sold out" via web_search. Cheap but not
  authoritative — Haiku might say sold out when only one tier is, etc.
- **Per-platform scrape probes** (Resy availability API, Ticketmaster
  resale fall-through pages, Eventbrite's `availability` field on the
  event page schema). High variance, brittle.
- **Punt** — display a "may be sold out" disclaimer on cards within
  3 days of the event date, click anyway.

Recommended: **punt for now**, revisit if affiliate revenue justifies
the engineering. Bad clicks aren't catastrophic — user just sees the
sold-out page on the platform.

### Adam-side / external

| # | Item | What's needed |
|---|---|---|
| 11 | Real domain (locale.com or similar) | Buy from registrar; set up Netlify custom domain + cert; update CORS allowlist on backend; update Google OAuth authorized domains |
| 12 | Custom Google OAuth so consent screen says "Locale" | Steps already documented in earlier ROADMAP.md section + IOS_APP.md. Walkthrough: Google Cloud Console → Branding → app name "Locale" + URLs to your Netlify domain. Last attempt typed `.netlify.com` instead of `.netlify.app` and Google rejected — fix that and retry. |

---

## Late-April 2026 — second push (Sunday-empty + ambient polish)

User feedback after the first late-April batch:
- Sunday-night Locale was nearly empty
- Random "How was X event?" prompts for events Adam didn't attend
- Ambient mode weather card felt orphaned, calendar strip didn't read as a calendar

### ✅ Shipped

**Frontend (8f9c643)**
- PostEventFeedback prompt: suppressed entirely on ambient screen (was
  jarring on the clock/photo screensaver). Tightened the "should we ask"
  rule to fire only for events whose date is in the last 14 days AND were
  added within 14 days BEFORE the event date AND not added after the
  event ended. Stops the "asking about events I never went to" loop
  caused by stale localStorage from old test sessions.
- Ambient: today's weather card consolidated into the right-side chart
  panel (was orphaned top-left). High/Low promoted from 11px micro-line
  to 26px stack. Precip-% chart axis padding bumped padR 14→32 so labels
  don't get cut off. Calendar strip now buckets each day's events into
  Morning/Afternoon/Evening with dim gold-tinted day-part headers — empty
  buckets show a thin "—" placeholder. Reads as a calendar timeline.

**Backend (this commit)**
- DC evergreens seed: ~80 hand-curated entries added across the 10
  categories that previously had ZERO. Now 115 total, every category
  min 3 (comedy is the floor). Categories that were 0 now have 5–8.
  Big lift toward the "5–7 events per category" target — even when live
  scrape is thin, evergreens fill in.
- Extractor lookahead: prompt rule 2 rewritten. Was "events ON or DURING
  the target weekend"; now "any time in the next 6 weeks — this weekend
  + 5 weekends after + weeknights between". Venue calendars almost
  always publish weeks ahead — we were throwing away the future.
- expires_at default fixed: was "this weekend's Sunday" when no end_date
  on an event, which deactivated future events the moment the weekend
  rolled. Now defaults to the event's own start_date + 1 day; falls
  back to 30 days when no date at all.
- Out-of-DC sources: added NYC Go, Time Out NY, Philly Festivals, CFG
  Bank Arena Baltimore, Visit Wilmington DE, Walter E Washington
  Convention Center, Pennsylvania Convention Center, Baltimore
  Convention Center, Hampton Roads Convention Center, Mid-Atlantic
  Festivals.
- Extractor prompt rule 5c: out-of-metro sources only emit name-brand
  headliner-tier events (multi-day festivals, parades, marathons,
  comic-cons) tagged as `away` or `trips`. Skips individual venue
  listings.
- Extractor prompt rule 5d: convention centers only emit consumer-
  facing expos (auto/anime/comic/food shows). Skip B2B conferences.

### Open / chosen but not yet built

| Item | Status |
|---|---|
| #6 evergreens — option A (more sources) ongoing | Continuous as new venues come online; current seed is the floor |
| Cron the bookings refresh + parser-health check | Scheduled in code; will run next Monday 4:30am |
| Backfill `is_this_weekend` for already-extracted future events | Next pipeline run will re-flag correctly |
| Sold-out detection (#10) | Punted — see backlog |

### Backlog (intentionally deferred)

- **Sold-out detection before linking to tickets** — most platforms
  don't expose status without scraping JS-rendered pages. Best-effort
  Haiku web_search at feed-build is cheap but not authoritative; per-
  platform scrape probes are brittle. Punt; revisit if affiliate revenue
  justifies engineering. Bad clicks aren't catastrophic — user lands on
  the sold-out page on the platform.
- **Real domain (#11)** — when ready: register, point Netlify, update
  CORS, update Google OAuth authorized domains.
- **Google OAuth Locale-branded consent screen (#12)** — Branding page
  needs `.netlify.app` (not `.com`) typo fix from earlier attempt.
