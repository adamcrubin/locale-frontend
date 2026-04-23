// ── usePipelineStatus.js ──────────────────────────────────────────────────────
// Polls /api/pipeline-status every 8 seconds to detect when scraping or
// extraction is running. Returns { active, label } so the UI can show
// a subtle "updating" indicator without blocking anything.

import { useState, useEffect, useRef } from 'react';

const POLL_MS = 8000;

export function usePipelineStatus() {
  const [status, setStatus]   = useState({ scraping: false, extracting: false });
  const [active, setActive]   = useState(false);
  const [label,  setLabel]    = useState('');
  const timerRef              = useRef(null);

  const check = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const res  = await fetch(`${base}/pipeline-status`);
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
      if (data.scraping) {
        setActive(true);
        setLabel('Scraping sources…');
      } else if (data.extracting) {
        setActive(true);
        setLabel('Extracting events…');
      } else {
        setActive(false);
        setLabel('');
      }
    } catch {
      // Silent — network error just means no indicator shown
    }
  };

  useEffect(() => {
    check();
    timerRef.current = setInterval(check, POLL_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  return { active, label, status };
}
