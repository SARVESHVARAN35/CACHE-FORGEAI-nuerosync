package com.example.cachelab.service;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Predictive prefetching: tracks which key is usually accessed after a given key (A→B).
 * When key A is accessed, the engine notes what comes next (B). After enough observations
 * it predicts B will follow A and reports it so the caller can prefetch B.
 *
 * Algorithm: per-key frequency map of successors. Predict the most-frequent successor
 * when it exceeds a confidence threshold.
 *
 * Everything is observed from live traffic – no hardcoded key names.
 */
@Component
public class PrefetchEngine {

    /** Minimum times A→B must appear before we trust the prediction. */
    private static final int MIN_CONFIDENCE = 3;

    /** We only predict if the top successor has >= this fraction of A's total successors. */
    private static final double MIN_RATIO = 0.40;

    /** Maximum distinct keys to track (memory guard). */
    private static final int MAX_TRACKED = 2_000;

    /** key → (successor → count) */
    private final Map<String, Map<String, Integer>> successorCounts = new ConcurrentHashMap<>();

    private volatile String lastKey = null;
    private final AtomicLong totalPrefetches = new AtomicLong();

    /**
     * Called after every cache access (hit or miss). Records the A→B transition and
     * returns the predicted next key to prefetch, or {@code null} if confidence is too low.
     */
    public String onAccess(String key) {
        String prev = lastKey;
        lastKey = key;

        if (prev != null && !prev.equals(key)) {
            // Record prev → key transition
            if (successorCounts.size() < MAX_TRACKED) {
                successorCounts
                    .computeIfAbsent(prev, k -> new ConcurrentHashMap<>())
                    .merge(key, 1, Integer::sum);
            }
        }

        // Predict what will follow 'key'
        return predict(key);
    }

    /** Returns the best successor prediction for a given key, or null. */
    private String predict(String key) {
        Map<String, Integer> successors = successorCounts.get(key);
        if (successors == null || successors.isEmpty()) return null;

        int total = 0;
        String best = null;
        int bestCount = 0;
        for (Map.Entry<String, Integer> e : successors.entrySet()) {
            total += e.getValue();
            if (e.getValue() > bestCount) { bestCount = e.getValue(); best = e.getKey(); }
        }
        if (bestCount < MIN_CONFIDENCE) return null;
        if (bestCount < total * MIN_RATIO) return null;
        return best;
    }

    /** Called when a prefetch is executed. */
    public void recordPrefetch() {
        totalPrefetches.incrementAndGet();
    }

    public long getTotalPrefetches() { return totalPrefetches.get(); }

    /** How many unique keys we are currently tracking transitions for. */
    public int getTrackedKeys() { return successorCounts.size(); }

    /** Reset all learned patterns (e.g. after cache clear). */
    public void reset() {
        successorCounts.clear();
        lastKey = null;
        totalPrefetches.set(0);
    }
}
