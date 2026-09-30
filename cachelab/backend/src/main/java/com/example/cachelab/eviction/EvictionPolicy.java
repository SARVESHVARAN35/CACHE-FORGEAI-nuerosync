package com.example.cachelab.eviction;

/** Strategy interface. Policies only track ordering/frequency; TTL is handled by the cache. Not thread-safe: the cache locks around it. */
public interface EvictionPolicy<K> {
    void onInsert(K key);
    void onAccess(K key);
    void onRemove(K key);
    /** Removes and returns the next victim, or null if empty. */
    K evict();
    void clear();
    String name();

    /** Rebuilds state for an existing entry when switching policies (called oldest-access first). */
    default void restore(K key, long accessCount) {
        onInsert(key);
    }
}
