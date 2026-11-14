'use client';
import { useEffect, useRef } from 'react';
import { ls } from './safe';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Keeps a live connection to the server. onMessage gets:
//   { type: 'trips', tripId, msg }  when something changed for this user
//   { type: 'resync' }              when the phone wakes up (events may have been missed)
export function useLive(onMessage) {
  const cb = useRef(onMessage);
  cb.current = onMessage;

  useEffect(() => {
    let stopped = false, ctrl = null, timer = null, last = Date.now();

    async function connect() {
      const token = ls.get('token');
      if (!token || stopped) return;
      ctrl = new AbortController();
      last = Date.now();
      try {
        const res = await fetch(BASE + '/events', { headers: { Authorization: 'Bearer ' + token }, signal: ctrl.signal });
        if (res.status === 401) { stopped = true; return; }
        if (!res.ok || !res.body) throw new Error('stream failed');
        cb.current({ type: 'resync' }); // (re)connected: catch up on anything missed
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          last = Date.now();
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const chunk = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const line = chunk.split('\n').find((l) => l.startsWith('data:'));
            if (line) { try { const msg = JSON.parse(line.slice(5)); if (msg && typeof msg === 'object') cb.current(msg); } catch { /* ignore bad message */ } }
          }
        }
      } catch { /* dropped connection: reconnect below */ }
      if (!stopped) timer = setTimeout(connect, 3000);
    }

    // The server pings every 25s. If nothing arrives for 60s the connection is dead, so reconnect.
    const watchdog = setInterval(() => { if (Date.now() - last > 60000) ctrl?.abort(); }, 10000);

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      cb.current({ type: 'resync' });
      if (Date.now() - last > 40000) ctrl?.abort(); // looks stale after sleeping: reconnect now
    };
    document.addEventListener('visibilitychange', onVisible);

    connect();
    return () => {
      stopped = true;
      ctrl?.abort();
      clearTimeout(timer);
      clearInterval(watchdog);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
}
