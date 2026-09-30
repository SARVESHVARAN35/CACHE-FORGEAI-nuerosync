package com.example.cachelab.eviction;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;

/** O(1) LFU. Ties on frequency are broken by evicting the least recently used among them. */
public class LfuPolicy<K> implements EvictionPolicy<K> {
    private final Map<K, Integer> freq = new HashMap<>();
    private final Map<Integer, LinkedHashSet<K>> buckets = new HashMap<>();
    private int minFreq = 0;

    @Override public void onInsert(K key) { onRemove(key); place(key, 1); }

    @Override public void restore(K key, long accessCount) {
        onRemove(key);
        place(key, (int) Math.min(Integer.MAX_VALUE - 1L, accessCount + 1));
    }

    @Override public void onAccess(K key) {
        Integer f = freq.get(key);
        if (f == null) return;
        detach(key, f);
        place(key, f + 1);
    }

    @Override public void onRemove(K key) {
        Integer f = freq.get(key);
        if (f != null) detach(key, f);
    }

    @Override public K evict() {
        if (freq.isEmpty()) return null;
        LinkedHashSet<K> bucket = buckets.get(minFreq);
        if (bucket == null || bucket.isEmpty()) {
            minFreq = Collections.min(buckets.keySet());
            bucket = buckets.get(minFreq);
        }
        K victim = bucket.iterator().next();
        detach(victim, minFreq);
        return victim;
    }

    @Override public void clear() { freq.clear(); buckets.clear(); minFreq = 0; }
    @Override public String name() { return "LFU"; }

    private void place(K key, int f) {
        freq.put(key, f);
        buckets.computeIfAbsent(f, x -> new LinkedHashSet<>()).add(key);
        if (minFreq == 0 || f < minFreq) minFreq = f;
    }

    private void detach(K key, int f) {
        freq.remove(key);
        LinkedHashSet<K> set = buckets.get(f);
        if (set != null) {
            set.remove(key);
            if (set.isEmpty()) buckets.remove(f);
        }
    }
}
