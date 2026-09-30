package com.example.cachelab.eviction;

import java.util.Iterator;
import java.util.LinkedHashSet;

public class LruPolicy<K> implements EvictionPolicy<K> {
    private final LinkedHashSet<K> order = new LinkedHashSet<>();

    @Override public void onInsert(K key) { order.remove(key); order.add(key); }

    @Override public void onAccess(K key) {
        if (order.remove(key)) order.add(key);
    }

    @Override public void onRemove(K key) { order.remove(key); }

    @Override public K evict() {
        Iterator<K> it = order.iterator();
        if (!it.hasNext()) return null;
        K victim = it.next();
        it.remove();
        return victim;
    }

    @Override public void clear() { order.clear(); }
    @Override public String name() { return "LRU"; }
}
