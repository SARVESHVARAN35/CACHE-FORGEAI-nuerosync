package com.example.cachelab.cache;

final class CacheEntry<K, V> {
    final K key;
    V value;
    long accessCount;
    long lastAccessedAt;
    long ttlMillis;   // 0 = none
    long expiresAt;   // 0 = never

    CacheEntry(K key, V value, long now, long ttlMillis) {
        this.key = key;
        this.lastAccessedAt = now;
        update(value, now, ttlMillis);
    }

    void update(V value, long now, long ttlMillis) {
        this.value = value;
        this.ttlMillis = Math.max(0, ttlMillis);
        this.expiresAt = this.ttlMillis > 0 ? now + this.ttlMillis : 0;
    }

    boolean isExpired(long now) { return expiresAt > 0 && now >= expiresAt; }

    void touch(long now) { accessCount++; lastAccessedAt = now; }
}
