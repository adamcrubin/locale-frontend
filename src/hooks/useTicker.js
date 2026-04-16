import { useState, useCallback, useEffect } from 'react';
import { TICKER_ITEMS } from '../data/content';

export function useTicker() {
  const [dismissed, setDismissed] = useState({});
  const [idx, setIdx] = useState(0);

  const items = TICKER_ITEMS.filter(t => !dismissed[t.text]);
  const current = items.length ? items[idx % items.length] : null;

  const next = useCallback(() => setIdx(i => i + 1), []);

  const markDone = useCallback(() => {
    if (!current || current.type !== 'reminder') return;
    setDismissed(d => ({ ...d, [current.text]: true }));
    setIdx(i => i + 1);
  }, [current]);

  // auto-rotate every 14s
  useEffect(() => {
    const iv = setInterval(next, 14000);
    return () => clearInterval(iv);
  }, [next]);

  return { current, next, markDone };
}
