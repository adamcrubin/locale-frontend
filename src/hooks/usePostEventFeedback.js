import { useState, useEffect } from 'react';
import { postFeedback } from '../lib/api';

const STORAGE_KEY = 'locale-pending-feedback';

// Load pending feedback items from localStorage
function loadPending() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function savePending(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// Track a newly added calendar event for future feedback
export function trackForFeedback(entry) {
  if (!entry?.activityId) return;
  const pending = loadPending();
  // Don't add duplicates
  if (pending.find(p => p.activityId === entry.activityId)) return;
  pending.push({
    activityId:   entry.activityId,
    activityType: entry.activityType || 'event',
    title:        entry.title,
    date:         entry.date,
    addedAt:      new Date().toISOString(),
    askedAt:      null,
    response:     null,
  });
  savePending(pending);
}

export function usePostEventFeedback(profileId, zipCode = '22046') {
  const [prompt, setPrompt] = useState(null); // { activityId, activityType, title }

  useEffect(() => {
    if (!profileId) return;

    const check = () => {
      const pending = loadPending();
      const now     = new Date();

      // Only prompt about events the user is plausibly going to remember
      // attending. Specifically:
      //   - hasn't been asked about yet
      //   - the event date is in the past but within the last 14 days
      //   - the user added it within 14 days BEFORE the event date
      //     (so we're not asking about a calendar add from 6 months ago
      //     for an event that the user almost certainly didn't actually go to)
      //   - it's been at least a day since the event ended
      const due = pending.find(p => {
        if (p.askedAt || p.response) return false;
        if (!p.date) return false;
        const eventDate = new Date(p.date + 'T23:59:59');
        const addedDate = new Date(p.addedAt);
        const eventToNowDays = (now - eventDate) / 86400000;
        const addedToEventDays = (eventDate - addedDate) / 86400000;
        if (eventToNowDays < 1) return false;            // event hasn't ended yet (or barely)
        if (eventToNowDays > 14) return false;           // too old; user definitely won't remember
        if (addedToEventDays > 14) return false;         // added long before the event = probably never went
        if (addedToEventDays < -1) return false;         // added AFTER the event ended = weird, skip
        return true;
      });

      if (due) setPrompt(due);
    };

    check();
    // Re-check every hour
    const iv = setInterval(check, 60 * 60 * 1000);
    return () => clearInterval(iv);
  }, [profileId]);

  const respond = async (response) => {
    if (!prompt) return;

    // Record feedback. "didn't-go" is a real signal (slight negative —
    // we showed something the user wasn't compelled to attend) but not
    // as strong as a thumbs-down (where they went and disliked it).
    if (prompt.activityId && response !== 'skip') {
      const feedbackMap = {
        loved:      'up',
        ok:         'up',
        meh:        'down',
        'didnt-go': 'down',     // backend treats as down; could split later
        skip:       null,
      };
      const fb = feedbackMap[response];
      if (fb) {
        await postFeedback(profileId, prompt.activityId, prompt.activityType, fb, zipCode)
          .catch(() => {});
      }
    }

    // Mark as asked in pending list
    const pending = loadPending().map(p =>
      p.activityId === prompt.activityId
        ? { ...p, askedAt: new Date().toISOString(), response }
        : p
    );
    // On skip: also drop any stale entries (event date >14 days ago) so a
    // legacy localStorage from old test data doesn't perpetually re-prompt.
    // The 'ask' window above already filters them out, but cleaning the
    // store keeps localStorage tidy.
    const now = Date.now();
    const cutoffAdded = new Date(now - 30 * 86400000).toISOString();
    const cleaned = pending.filter(p => {
      if (p.addedAt < cutoffAdded) return false;          // older than 30d add
      if (!p.date) return p.addedAt > cutoffAdded;
      const eventAge = (now - new Date(p.date + 'T23:59:59').getTime()) / 86400000;
      if (eventAge > 21) return false;                    // event >3 weeks past
      return true;
    });
    savePending(cleaned);

    setPrompt(null);
  };

  return { prompt, respond };
}
