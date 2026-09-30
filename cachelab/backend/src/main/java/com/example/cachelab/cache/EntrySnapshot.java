package com.example.cachelab.cache;

public record EntrySnapshot<K, V>(K key, V value, long accessCount, long lastAccessedAt,
                                  long ttlMillis, long expiresAt, boolean expired) {}
