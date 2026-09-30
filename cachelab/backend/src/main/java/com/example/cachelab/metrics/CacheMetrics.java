package com.example.cachelab.metrics;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

public class CacheMetrics {
    public static final int MAX_EVENTS = 500;

    private final boolean recordEvents;
    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();
    private final AtomicLong puts = new AtomicLong();
    private final AtomicLong evictions = new AtomicLong();
    private final AtomicLong expirations = new AtomicLong();
    private final AtomicLong seq = new AtomicLong();
    private final Deque<ActivityEvent> events = new ArrayDeque<>(); // newest first

    public CacheMetrics() { this(true); }
    public CacheMetrics(boolean recordEvents) { this.recordEvents = recordEvents; }

    public void recordHit(String key) { hits.incrementAndGet(); event("HIT", key, null); }
    public void recordMiss(String key) { misses.incrementAndGet(); event("MISS", key, null); }
    public void recordPut(String key, String detail) { puts.incrementAndGet(); event("PUT", key, detail); }
    public void recordEviction(String key, String policy) { evictions.incrementAndGet(); event("EVICTION", key, policy + " policy"); }
    public void recordExpiration(String key) { expirations.incrementAndGet(); event("EXPIRATION", key, "TTL elapsed"); }

    public long getHits() { return hits.get(); }
    public long getMisses() { return misses.get(); }
    public long getPuts() { return puts.get(); }
    public long getEvictions() { return evictions.get(); }
    public long getExpirations() { return expirations.get(); }

    public List<ActivityEvent> recent(int limit) {
        synchronized (events) {
            List<ActivityEvent> out = new ArrayList<>(Math.min(limit, events.size()));
            for (ActivityEvent e : events) {
                if (out.size() >= limit) break;
                out.add(e);
            }
            return out;
        }
    }

    /** Most recent HIT/MISS events, newest first. */
    public List<ActivityEvent> recentLookups(int limit) {
        synchronized (events) {
            List<ActivityEvent> out = new ArrayList<>();
            for (ActivityEvent e : events) {
                if (out.size() >= limit) break;
                if (e.type().equals("HIT") || e.type().equals("MISS")) out.add(e);
            }
            return out;
        }
    }

    public void reset() {
        hits.set(0); misses.set(0); puts.set(0); evictions.set(0); expirations.set(0);
        synchronized (events) { events.clear(); }
    }

    public static double round1(double v) { return Math.round(v * 10) / 10.0; }

    private void event(String type, String key, String detail) {
        if (!recordEvents) return;
        ActivityEvent ev = new ActivityEvent(seq.incrementAndGet(), System.currentTimeMillis(), type, key, detail);
        synchronized (events) {
            events.addFirst(ev);
            while (events.size() > MAX_EVENTS) events.removeLast();
        }
    }
}
