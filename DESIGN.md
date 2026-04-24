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
