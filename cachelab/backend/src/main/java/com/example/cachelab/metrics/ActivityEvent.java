package com.example.cachelab.metrics;

/** type: HIT | MISS | PUT | EVICTION | EXPIRATION */
public record ActivityEvent(long id, long timestamp, String type, String key, String detail) {}
