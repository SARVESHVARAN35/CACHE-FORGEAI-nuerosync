package com.example.cachelab.cache;

import com.example.cachelab.eviction.EvictionPolicy;
import com.example.cachelab.metrics.CacheMetrics;

import java.util.*;
import java.util.concurrent.locks.ReentrantLock;

/**
 * Thread-safe in-memory cache. A single lock guards the map and the policy state.
 * TTL lives on the entry and is independent from the eviction policy:
 * expired entries are removed lazily on access, by sweep(), and before any eviction.
 */
public class CacheImpl<K, V> implements Cache<K, V> {
    private final int capacity;
    private final Map<K, CacheEntry<K, V>> map = new LinkedHashMap<>();
    private final ReentrantLock lock = new ReentrantLock();
    private final CacheMetrics metrics;
    private EvictionPolicy<K> policy;

    public CacheImpl(int capacity, EvictionPolicy<K> policy, CacheMetrics metrics) {
        if (capacity < 1) throw new IllegalArgumentException("capacity must be >= 1");
        this.capacity = capacity;
        this.policy = policy;
        this.metrics = metrics;
    }

    @Override public void put(K key, V value) { put(key, value, 0); }

    @Override
    public void put(K key, V value, long ttlMillis) {
        lock.lock();
        try {
            long now = System.currentTimeMillis();
            CacheEntry<K, V> e = map.get(key);
            if (e != null && e.isExpired(now)) {
                removeExpired(key);
                e = null;
            }
            if (e != null) {
                e.update(value, now, ttlMillis);
                e.touch(now);
                policy.onAccess(key);
            } else {
                if (map.size() >= capacity) purgeExpired(now);
                if (map.size() >= capacity) evictOne();
                map.put(key, new CacheEntry<>(key, value, now, ttlMillis));
                policy.onInsert(key);
            }
            String detail = ttlMillis > 0
                    ? "TTL " + (ttlMillis >= 1000 ? (ttlMillis / 1000) + "s" : ttlMillis + "ms")
                    : "no TTL";
            metrics.recordPut(String.valueOf(key), detail);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public Optional<V> get(K key) {
        lock.lock();
        try {
            long now = System.currentTimeMillis();
            CacheEntry<K, V> e = map.get(key);
            if (e == null) {
                metrics.recordMiss(String.valueOf(key));
                return Optional.empty();
            }
            if (e.isExpired(now)) {
                removeExpired(key);
                metrics.recordMiss(String.valueOf(key));
                return Optional.empty();
            }
            e.touch(now);
            policy.onAccess(key);
            metrics.recordHit(String.valueOf(key));
            return Optional.of(e.value);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public V remove(K key) {
        lock.lock();
        try {
            CacheEntry<K, V> e = map.get(key);
            if (e == null) return null;
            if (e.isExpired(System.currentTimeMillis())) {
                removeExpired(key);
                return null;
            }
            map.remove(key);
            policy.onRemove(key);
            return e.value;
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void clear() {
        lock.lock();
        try {
            map.clear();
            policy.clear();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public int size() {
        lock.lock();
        try {
            long now = System.currentTimeMillis();
            int n = 0;
            for (CacheEntry<K, V> e : map.values()) if (!e.isExpired(now)) n++;
            return n;
        } finally {
            lock.unlock();
        }
    }

    @Override
    public boolean containsKey(K key) {
        lock.lock();
        try {
            CacheEntry<K, V> e = map.get(key);
            return e != null && !e.isExpired(System.currentTimeMillis());
        } finally {
            lock.unlock();
        }
    }

    /** Removes all expired entries. Called by the scheduled cleaner. */
    public int sweep() {
        lock.lock();
        try {
            return purgeExpired(System.currentTimeMillis());
        } finally {
            lock.unlock();
        }
    }

    /** Read-only view for the dashboard; does not touch counters or policy state. */
    public List<EntrySnapshot<K, V>> entries() {
        lock.lock();
        try {
            long now = System.currentTimeMillis();
            List<EntrySnapshot<K, V>> out = new ArrayList<>(map.size());
            for (CacheEntry<K, V> e : map.values()) {
                out.add(new EntrySnapshot<>(e.key, e.value, e.accessCount, e.lastAccessedAt,
                        e.ttlMillis, e.expiresAt, e.isExpired(now)));
            }
            return out;
        } finally {
            lock.unlock();
        }
    }

    /** Swaps the eviction strategy at runtime, rebuilding its state from the live entries. */
    public void setPolicy(EvictionPolicy<K> newPolicy) {
        lock.lock();
        try {
            List<CacheEntry<K, V>> sorted = new ArrayList<>(map.values());
            sorted.sort(Comparator.comparingLong((CacheEntry<K, V> e) -> e.lastAccessedAt));
            for (CacheEntry<K, V> e : sorted) newPolicy.restore(e.key, e.accessCount);
            this.policy = newPolicy;
        } finally {
            lock.unlock();
        }
    }

    public int capacity() { return capacity; }

    public String policyName() {
        lock.lock();
        try {
            return policy.name();
        } finally {
            lock.unlock();
        }
    }

    // ---- internals (lock must be held) ----

    private void removeExpired(K key) {
        map.remove(key);
        policy.onRemove(key);
        metrics.recordExpiration(String.valueOf(key));
    }

    private int purgeExpired(long now) {
        int count = 0;
        Iterator<Map.Entry<K, CacheEntry<K, V>>> it = map.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<K, CacheEntry<K, V>> en = it.next();
            if (en.getValue().isExpired(now)) {
                it.remove();
                policy.onRemove(en.getKey());
                metrics.recordExpiration(String.valueOf(en.getKey()));
                count++;
            }
        }
        return count;
    }

    private void evictOne() {
        K victim = policy.evict();
        if (victim == null && !map.isEmpty()) {           // safety net
            victim = map.keySet().iterator().next();
            policy.onRemove(victim);
        }
        if (victim != null) {
            map.remove(victim);
            metrics.recordEviction(String.valueOf(victim), policy.name());
        }
    }
}
