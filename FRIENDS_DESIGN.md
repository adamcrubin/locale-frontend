# Friends — Design Proposal

Status: **proposal — awaiting approval before implementation**

## User stories

1. User A adds User B as a friend by entering B's email.
2. B sees "N pending friend requests" on next login and can accept or decline.
3. After accepting, whenever A clicks **going / save / like** on an event, B sees a small avatar on that event's card.
4. In compact mode, the avatar appears as a small circle at the far right of the card.
5. In open (expanded) mode, the card gets an extra line: "[Name] is interested in this event".
6. Each interested friend adds a relevancy boost to the event's score for the viewer.
7. Both users can see their current friends in Settings and remove any of them.

## Data model — Supabase

Add two tables. All emails stored lowercased. Use the Supabase `auth.users` id (UUID) as the canonical user ref.

```sql
CREATE TABLE friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL CHECK (status IN ('pending','accepted','declined','blocked')),
  created_at   timestamptz DEFAULT NOW(),
  responded_at timestamptz,
  UNIQUE (requester_id, addressee_id)
);
CREATE INDEX idx_friendships_requester ON friendships(requester_id, status);
CREATE INDEX idx_friendships_addressee ON friendships(addressee_id, status);

-- Pending-invite hint for users who haven't signed up yet.
CREATE TABLE friend_invites_pending (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL,
  created_at   timestamptz DEFAULT NOW(),
  UNIQUE (requester_id, email)
);
```

`profile_events` already stores a user's interactions (save, going, like). No schema change needed there — we just query it filtered by friends when assembling the feed.

### RLS — must be enabled before launch
- `friendships`: row visible if `auth.uid() IN (requester_id, addressee_id)`.
- `friend_invites_pending`: row visible to requester only.

## API — to add on backend

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/friends` | List accepted friends for current user |
| GET | `/api/friends/pending` | Incoming pending requests (addressee = me) |
| POST | `/api/friends/invite` | Body `{ email }`. Creates pending friendship if email matches an existing user; otherwise rows into `friend_invites_pending`. |
| POST | `/api/friends/:id/accept` | Addressee accepts |
| POST | `/api/friends/:id/decline` | Addressee declines |
| DELETE | `/api/friends/:id` | Either party removes |

All endpoints auth-gated (Supabase JWT verified server-side — the repo already has this for `/store-tokens`; extend the middleware).

When user signs up, check `friend_invites_pending` for their email and auto-materialize those into `friendships` with `status='pending'`.

## Feed integration

Extend the feed endpoint (`getEventFeed` in [relevancy.js](../locale/src/services/relevancy.js)):

1. Resolve the viewer's friend ids once per feed call: `SELECT friend_id FROM friendships WHERE user = $viewer AND status='accepted'`.
2. For each event in the final list, attach `friends_interested: [{ user_id, name, action }]` where `action ∈ {going, saved, liked}` — pulled from `profile_events WHERE user_id = ANY($friend_ids) AND event_id = $evt.id AND action IN (...)` grouped by event.
3. Score boost: `+0.05 per interested friend, capped at +0.20` added inside the existing `Math.max(0, Math.min(1, …))` clamp. Tunable once we see real data.

## UI — frontend

- **Settings → Friends section** (new): list of current friends with "Remove". Input to invite by email. Pending requests (incoming) with Accept/Decline. Pending outgoing shown as a small sub-list.
- **Login flow**: if `/friends/pending` returns ≥1, show a non-blocking toast/banner on first render: "You have N friend requests → View".
- **Card — compact**: if `act.friends_interested?.length`, render up to 3 initial-circle avatars at the right edge before the ▾ toggle.
- **Card — expanded**: add a grey italic line above tags: "{Alex} and {Sam} are interested".

## Rollout checklist

1. Migrations (two tables, RLS policies).
2. Backend routes + JWT middleware extension.
3. `useFriends` hook (query + accept/decline/remove mutations).
4. Settings UI block.
5. Feed response extension + score boost.
6. Card rendering changes.
7. Onboarding hint on sign-in.

Nothing is destructive to existing data. Each checklist item ships as its own PR; feature is gated behind a `VITE_FRIENDS_ENABLED` env until the feed boost is tuned.

## Open questions for you
- Can we show friends' **names** (from `auth.users.raw_user_meta_data.full_name`) or only initials for privacy?
- Should the score boost compound for "going" (+0.10) vs "saved" (+0.05) vs "liked" (+0.03)? Or flat?
- Any block/mute requirement? (Schema has `blocked` state but UI spec above doesn't expose it.)
