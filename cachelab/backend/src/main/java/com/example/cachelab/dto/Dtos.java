package com.example.cachelab.dto;

import com.example.cachelab.metrics.ActivityEvent;
import com.example.cachelab.metrics.HealthCalculator.HealthReport;
import com.example.cachelab.service.AdaptiveAdvisor.AdaptiveAdvice;
import com.example.cachelab.service.AnomalyDetector.CacheAlert;

import java.util.List;

public final class Dtos {
    private Dtos() {}

    public record PutRequest(String value, Long ttlSeconds) {}
    public record PolicyRequest(String policy) {}
    public record GetResponse(String key, boolean hit, String value) {}
    public record RemoveResponse(String key, boolean removed) {}

    public record EntryDto(String key, String value, long accessCount, String heat,
                           Long ttlMillis, Long remainingMillis, long lastAccessedAt, String status) {}

    public record StatsDto(long hits, long misses, long lookups, long puts, long evictions, long expirations,
                           double hitRate, double missRate, double evictionRate, double expirationRate,
                           int size, int capacity, double utilization,
                           String policy, String activePolicy, boolean simulating,
                           HealthReport health, AdaptiveAdvice advice,
                           List<CacheAlert> alerts,
                           long prefetches, int trackedPrefetchKeys,
                           long timestamp) {}

    public record SnapshotDto(StatsDto stats, List<EntryDto> entries, List<ActivityEvent> events) {}

    public record WorkloadRequest(Integer requests, Integer keySpace, String pattern,
                                  Integer capacity, Long ttlSeconds) {}
    public record PolicyResult(String policy, long hits, long misses, double hitRate, long evictions) {}

    /** Three-way comparison: LRU, LFU, and Adaptive (switches mid-run) */
    public record CompareResult(String pattern, int requests, int keySpace, int capacity,
                                PolicyResult lru, PolicyResult lfu, PolicyResult adaptive,
                                String winner, double lfuAdvantage) {}
    public record SimulateResponse(boolean started, int requests, String pattern) {}

    public record ConcurrentRequest(Integer threads, Integer requestsPerThread, Double putRatio, Integer keySpace) {}
    public record ConcurrentResult(int threads, int totalRequests, double durationMs, double opsPerSec,
                                    long hits, long misses, long evictions) {}
}
