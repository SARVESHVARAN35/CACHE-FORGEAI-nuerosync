package com.example.cachelab.service;

import com.example.cachelab.cache.CacheImpl;
import com.example.cachelab.dto.Dtos.CompareResult;
import com.example.cachelab.dto.Dtos.PolicyResult;
import com.example.cachelab.dto.Dtos.WorkloadRequest;
import com.example.cachelab.eviction.EvictionPolicy;
import com.example.cachelab.eviction.LfuPolicy;
import com.example.cachelab.eviction.LruPolicy;
import com.example.cachelab.metrics.CacheMetrics;
import org.springframework.stereotype.Component;

import java.util.*;

/** Replays the SAME generated request sequence against isolated LRU, LFU, and Adaptive caches. */
@Component
public class WorkloadComparator {

    public static int clamp(int v, int min, int max) { return Math.max(min, Math.min(max, v)); }

    public static String normalize(String pattern) {
        if (pattern == null) return "ZIPF";
        String p = pattern.trim().toUpperCase();
        return (p.equals("UNIFORM") || p.equals("SCAN")) ? p : "ZIPF";
    }

    public CompareResult compare(WorkloadRequest req, int liveCapacity) {
        int requests = clamp(req.requests() == null ? 5000 : req.requests(), 100, 100_000);
        int keySpace = clamp(req.keySpace() == null ? 200 : req.keySpace(), 2, 10_000);
        int capacity = clamp(req.capacity() == null ? liveCapacity : req.capacity(), 1, 10_000);
        String pattern = normalize(req.pattern());

        List<String> sequence = generate(pattern, requests, keySpace, capacity, new Random());
        PolicyResult lru  = run(new LruPolicy<>(), sequence, capacity);
        PolicyResult lfu  = run(new LfuPolicy<>(), sequence, capacity);
        PolicyResult adaptive = runAdaptive(sequence, capacity);

        double advantage = CacheMetrics.round1(lfu.hitRate() - lru.hitRate());
        // Winner is whichever of the three has the highest hit rate
        PolicyResult best = best(lru, lfu, adaptive);
        String winner = best.policy();
        return new CompareResult(pattern, requests, keySpace, capacity, lru, lfu, adaptive, winner, advantage);
    }

    public List<String> generate(String pattern, int requests, int keySpace, int capacity, Random rnd) {
        List<String> keys = new ArrayList<>(requests);
        switch (pattern) {
            case "UNIFORM" -> {
                for (int i = 0; i < requests; i++) keys.add("key-" + rnd.nextInt(keySpace));
            }
            case "SCAN" -> {   // half the traffic hits a small hot set, half is a sequential scan
                int hot = Math.max(1, capacity / 2);
                int scan = 0;
                for (int i = 0; i < requests; i++) {
                    if (rnd.nextBoolean()) keys.add("hot-" + rnd.nextInt(hot));
                    else keys.add("scan-" + (scan++ % keySpace));
                }
            }
            default -> {       // ZIPF: few keys receive most of the traffic
                double[] cum = new double[keySpace];
                double sum = 0;
                for (int i = 0; i < keySpace; i++) {
                    sum += 1.0 / Math.pow(i + 1, 1.1);
                    cum[i] = sum;
                }
                for (int i = 0; i < requests; i++) {
                    double x = rnd.nextDouble() * sum;
                    int idx = Arrays.binarySearch(cum, x);
                    if (idx < 0) idx = -idx - 1;
                    if (idx >= keySpace) idx = keySpace - 1;
                    keys.add("key-" + idx);
                }
            }
        }
        return keys;
    }

    /** Adaptive simulation: re-evaluates skew every 200 requests and switches LRU↔LFU accordingly. */
    private PolicyResult runAdaptive(List<String> sequence, int capacity) {
        CacheMetrics metrics = new CacheMetrics(false);
        // start with LRU
        boolean usingLfu = false;
        EvictionPolicy<String> policy = new LruPolicy<>();
        CacheImpl<String, String> cache = new CacheImpl<>(capacity, policy, metrics);

        // Track recent lookups for skew analysis
        ArrayDeque<String> recentKeys = new ArrayDeque<>();
        int WINDOW = 200;

        for (int i = 0; i < sequence.size(); i++) {
            String key = sequence.get(i);
            if (cache.get(key).isEmpty()) cache.put(key, "v");
            recentKeys.addLast(key);
            if (recentKeys.size() > WINDOW) recentKeys.removeFirst();

            // Re-evaluate every WINDOW requests
            if ((i + 1) % WINDOW == 0 && recentKeys.size() >= WINDOW) {
                boolean shouldUseLfu = isSkewed(recentKeys);
                if (shouldUseLfu != usingLfu) {
                    usingLfu = shouldUseLfu;
                    cache.setPolicy(usingLfu ? new LfuPolicy<>() : new LruPolicy<>());
                }
            }
        }
        long hits = metrics.getHits(), misses = metrics.getMisses(), total = hits + misses;
        double rate = total == 0 ? 0 : CacheMetrics.round1(hits * 100.0 / total);
        return new PolicyResult("ADAPTIVE", hits, misses, rate, metrics.getEvictions());
    }

    /** Returns true if top-20% keys receive >= 55% of traffic (same rule as AdaptiveAdvisor). */
    private boolean isSkewed(Collection<String> keys) {
        Map<String, Integer> counts = new HashMap<>();
        for (String k : keys) counts.merge(k, 1, Integer::sum);
        List<Integer> sorted = new ArrayList<>(counts.values());
        sorted.sort(Comparator.reverseOrder());
        int topN = Math.max(1, (int) Math.ceil(counts.size() * 0.2));
        int top = sorted.subList(0, Math.min(topN, sorted.size())).stream().mapToInt(Integer::intValue).sum();
        return keys.size() > 0 && (double) top / keys.size() >= 0.55;
    }

    private PolicyResult run(EvictionPolicy<String> policy, List<String> sequence, int capacity) {
        CacheMetrics metrics = new CacheMetrics(false);
        CacheImpl<String, String> cache = new CacheImpl<>(capacity, policy, metrics);
        for (String key : sequence) {
            if (cache.get(key).isEmpty()) cache.put(key, "v");   // cache-aside
        }
        long hits = metrics.getHits(), misses = metrics.getMisses(), total = hits + misses;
        double rate = total == 0 ? 0 : CacheMetrics.round1(hits * 100.0 / total);
        return new PolicyResult(policy.name(), hits, misses, rate, metrics.getEvictions());
    }

    private PolicyResult best(PolicyResult... results) {
        PolicyResult b = results[0];
        for (PolicyResult r : results) if (r.hitRate() > b.hitRate()) b = r;
        return b;
    }
}
