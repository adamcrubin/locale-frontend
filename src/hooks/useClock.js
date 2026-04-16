import { useState, useEffect } from 'react';

export function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(iv);
  }, []);

  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, '0');
  const timeStr = `${h}:${m}`;

  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dateStr = `${days[now.getDay()]} · ${months[now.getMonth()]} ${now.getDate()}`;
  const shortStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return { timeStr, dateStr, shortStr };
}
