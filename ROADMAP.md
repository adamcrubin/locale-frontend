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
