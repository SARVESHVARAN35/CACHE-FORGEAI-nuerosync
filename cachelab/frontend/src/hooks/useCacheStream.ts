import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { Snapshot } from '../types/cache';

export type ConnectionState = 'connecting' | 'live' | 'polling' | 'offline';
export interface HistoryPoint { time: string; hits: number; misses: number }

const MAX_POINTS = 60;

/** SSE first; falls back to 1s polling of /snapshot if the stream errors. */
export function useCacheStream() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting');
  const prev = useRef<{ hits: number; misses: number } | null>(null);

  const ingest = useCallback((s: Snapshot) => {
    const { hits, misses, timestamp } = s.stats;
    const p = prev.current;
    const dh = p ? (hits >= p.hits ? hits - p.hits : hits) : 0;
    const dm = p ? (misses >= p.misses ? misses - p.misses : misses) : 0;
    prev.current = { hits, misses };
    setSnapshot(s);
    setHistory((h) =>
      [...h, { time: new Date(timestamp).toLocaleTimeString([], { hour12: false }), hits: dh, misses: dm }]
        .slice(-MAX_POINTS),
    );
  }, []);

  /** Immediate refresh after a user action (does not add a chart point). */
  const refresh = useCallback(async () => {
    try { setSnapshot(await api.snapshot()); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let timer: number | undefined;
    let es: EventSource | null = new EventSource(api.streamUrl);

    const startPolling = () => {
      if (timer !== undefined) return;
      const tick = async () => {
        try { ingest(await api.snapshot()); setConnection('polling'); }
        catch { setConnection('offline'); }
      };
      void tick();
      timer = window.setInterval(tick, 1000);
    };

    es.addEventListener('snapshot', (e) => {
      ingest(JSON.parse((e as MessageEvent<string>).data) as Snapshot);
      setConnection('live');
    });
    es.onerror = () => {
      es?.close();
      es = null;
      startPolling();
    };

    return () => {
      es?.close();
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [ingest]);

  return { snapshot, history, connection, refresh };
}
