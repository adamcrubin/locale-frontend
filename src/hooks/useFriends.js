// ── useFriends.js ─────────────────────────────────────────────────────────────
// Exposes the user's current friends + pending incoming requests plus the
// mutations that change them. The friends_interested indicator on event cards
// is independent of this hook — it's computed server-side from profile_events.
// This hook is used by the Settings → Friends section + the pending-requests
// sign-in banner.

import { useCallback, useEffect, useState } from 'react';
import {
  fetchFriends,
  fetchFriendsPending,
  inviteFriend as apiInvite,
  acceptFriend as apiAccept,
  declineFriend as apiDecline,
  removeFriend as apiRemove,
} from '../lib/api';

export function useFriends(user) {
  const userId = user?.id || null;
  const [friends, setFriends]   = useState([]);
  const [pending, setPending]   = useState([]);
  const [autoAll, setAutoAll]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);

  const load = useCallback(async () => {
    if (!userId) { setFriends([]); setPending([]); return; }
    setLoading(true);
    setError(null);
    try {
      const [f, p] = await Promise.all([
        fetchFriends(userId).catch(() => ({ friends: [], autoAll: false })),
        fetchFriendsPending(userId).catch(() => []),
      ]);
      setFriends(f.friends);
      setAutoAll(f.autoAll);
      setPending(p);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const invite = useCallback(async (email) => {
    if (!userId) throw new Error('Must be signed in to invite friends');
    const res = await apiInvite(email, userId);
    await load();
    return res;
  }, [userId, load]);

  const accept = useCallback(async (friendshipId) => {
    await apiAccept(friendshipId, userId);
    await load();
  }, [userId, load]);

  const decline = useCallback(async (friendshipId) => {
    await apiDecline(friendshipId, userId);
    await load();
  }, [userId, load]);

  const remove = useCallback(async (friendshipId) => {
    await apiRemove(friendshipId, userId);
    await load();
  }, [userId, load]);

  return { friends, pending, autoAll, loading, error, invite, accept, decline, remove, reload: load };
}
