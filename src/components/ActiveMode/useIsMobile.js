import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return mobile;
}

// Tablet = anything from phablet up to iPad Pro landscape (≤ 1366px) but
// at least 768px wide. Lets the layout cap to 3 columns + bump card
// sizing for finger-tap targets, while desktop monitors keep the
// existing 4-column packed layout.
export function useIsTablet() {
  const compute = () => {
    const w = window.innerWidth;
    return w >= 768 && w <= 1366;
  };
  const [tablet, setTablet] = useState(compute);
  useEffect(() => {
    const handler = () => setTablet(compute());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return tablet;
}
