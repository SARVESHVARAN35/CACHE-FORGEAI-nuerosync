package com.example.cachelab.cache;

import java.util.Optional;

public interface Cache<K, V> {
    void put(K key, V value);
    /** ttlMillis <= 0 means no expiry. */
    void put(K key, V value, long ttlMillis);
    Optional<V> get(K key);
    /** Returns the removed value, or null if absent/expired. */
    V remove(K key);
    void clear();
    /** Number of live (non-expired) entries. */
    int size();
    boolean containsKey(K key);
}
