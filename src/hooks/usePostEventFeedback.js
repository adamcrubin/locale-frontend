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

      // Find an event that:
      // - happened in the past (date < today)
      // - hasn't been asked about yet
      // - was added at least 1 day ago (don't ask same day)
      const due = pending.find(p => {
        if (p.askedAt || p.response) return false;
        if (!p.date) return false;
        const eventDate = new Date(p.date + 'T23:59:59');
        const addedDate = new Date(p.addedAt);
        const daysSinceAdded = (now - addedDate) / 86400000;
        return eventDate < now && daysSinceAdded >= 1;
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

    // Record feedback
    if (prompt.activityId && response !== 'skip') {
      const feedbackMap = { loved:'up', ok:'up', meh:'down', skip:null };
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
    // Clean up old items (older than 30 days)
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString();
    savePending(pending.filter(p => p.addedAt > cutoff));

    setPrompt(null);
  };

  return { prompt, respond };
}
