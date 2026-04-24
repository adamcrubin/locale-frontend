# Loading UX — Plan

Status: **proposal — awaiting asset + copy confirmation**

Addresses feedback items #7 and #8: first load is long, and there's a jolt when mock data is replaced with real data.

## Problem today

`useActivities` seeds state from `ACTIVITIES` mock and immediately fetches real data. When the real response lands, every card swaps at once — titles, costs, venues, photos all shift mid-render. On top of that, the API can take 2–5s to reply (scraped + scored on the server).

## Proposed changes

### 1. Dedicated branded loading screen on cold start

Show a full-screen splash *instead of* mock data when there's no cached feed yet.

- Centered `Locale` wordmark (reuses header font `Cormorant Garamond` or `--font-display`).
- Spinner bar under it.
- Rotating tagline (switches every 2.2s):
  - "Curating a great weekend…"
  - "Getting the latest events for you…"
  - "Checking the weather…"
  - "Finding the best neighborhoods…"
- Mini-slideshow strip behind the wordmark: 3–4 faded generic "people having fun" photos with gentle crossfade every 4s.

**Asset question for you:** do you want me to (a) use Unsplash via their CDN (licensed for this use, free, no API key needed for static URLs), (b) pull from an internal `/public/loading/` folder you'll provide, or (c) use solid color gradients only (zero assets) for V1?

### 2. Skeleton cards instead of mock data on warm start

When there *is* a cached feed, show it immediately (we already do). When there's no cache but we're mid-fetch, show empty skeleton cards — grey rectangles where titles/venues would be — rather than mock data that will then swap.

Implementation:
- Move the "seed state from `ACTIVITIES` mock" line in `useActivities.js` behind a flag. If the real data is arriving within 600ms, don't seed mock at all — show skeletons.
- Transition: fade the skeleton to the real card over 180ms so it feels like content *appearing*, not *replacing*.

### 3. Prevent the "jolt"

The big layout shift is triggered by photos loading at different widths/heights after cards render. Fix:
- Fix card heights via `minHeight` (already partially done — ActCard has `minHeight:44`) and pad any inline image with a reserved container that matches the final aspect ratio.
- Start `<img>` fetches preemptively on the first paint using a hidden `<link rel="preload" as="image">` in the head for the top 3 images per column.

### 4. Loading state contract

Expose three states from `useActivities`:
- `cold` — no cache, no live data, first fetch in flight → show splash
- `warm` — have cache or mock, refreshing in the background → show content with a tiny pulse dot in header
- `live` — latest data, nothing in flight → normal

`ActiveMode` reads this and picks the right UI.

## Files to touch

- `src/hooks/useActivities.js` — add `loadState` union
- `src/components/LoadingSplash.jsx` — **new**
- `src/App.jsx` — render `LoadingSplash` when `loadState === 'cold'` before the main screen
- `src/components/ActiveMode/ActCard.jsx` — add a `skeleton` prop

## Size estimate

- Splash screen: ~60 LOC
- useActivities state machine: ~20 LOC
- Skeleton prop on ActCard: ~15 LOC
- Image preloader: ~10 LOC

Not a big change if we go the solid-gradient route. The slideshow version adds another ~80 LOC for the carousel.

## Decisions needed
- Photo assets: Unsplash / your bucket / gradient-only?
- Exact tagline wording — want to set those now?
- Should `cold` splash only appear the first time per session, or every time (including tab re-focus after > 5 min)?
