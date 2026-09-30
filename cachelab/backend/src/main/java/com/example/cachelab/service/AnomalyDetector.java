package com.example.cachelab.service;

import com.example.cachelab.metrics.ActivityEvent;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;

/**
 * Detects anomalies by comparing the miss-rate in a recent short window
 * vs a longer baseline window – both derived from live lookup events.
 *
 * No hardcoded thresholds on absolute traffic; the spike is relative to
 * the observed baseline, so it works at any scale.
 *
 *  ┌────────── baseline window (last 200 lookups) ──────────┐
 *  └──── recent window (last 30 lookups) ──── ┘
 *
 * If recent-miss-rate exceeds baseline-miss-rate by >= SPIKE_DELTA
 * and the sample is large enough, we emit an alert.
 */
@Component
public class AnomalyDetector {

    /** Minimum lookups in the recent window before we evaluate. */
    private static final int MIN_RECENT = 20;

    /** Minimum lookups in the baseline window before we evaluate. */
    private static final int MIN_BASELINE = 60;

    /** How many percentage points above baseline counts as a spike. */
    private static final double SPIKE_DELTA = 20.0; // e.g. baseline 15% → alert if recent > 35%

    /** Utilization % above which we suggest increasing capacity. */
    private static final double HIGH_UTIL_THRESHOLD = 0.92;

    public record CacheAlert(String type, String message, String suggestion) {}

    /**
     * Analyse recent lookups (newest first) and utilization.
     * Returns a list of active alerts (usually 0 or 1).
     */
    public List<CacheAlert> analyze(List<ActivityEvent> recentLookups, double utilization) {

        // --- 1. Miss-rate spike detection ---
        int recentMisses = 0, recentTotal = 0;
        int baselineMisses = 0, baselineTotal = 0;

        for (int i = 0; i < recentLookups.size(); i++) {
            ActivityEvent e = recentLookups.get(i);
            boolean isMiss = "MISS".equals(e.type());
            boolean isLookup = isMiss || "HIT".equals(e.type());
            if (!isLookup) continue;

            baselineTotal++;
            if (isMiss) baselineMisses++;

            if (recentTotal < 30) {            // first 30 = "recent" window
                recentTotal++;
                if (isMiss) recentMisses++;
            }
            if (baselineTotal >= 200) break;   // enough for baseline
        }

        if (recentTotal >= MIN_RECENT && baselineTotal >= MIN_BASELINE) {
            double recentRate  = recentMisses  * 100.0 / recentTotal;
            double baselineRate = baselineMisses * 100.0 / baselineTotal;
            double spike = recentRate - baselineRate;

            if (spike >= SPIKE_DELTA) {
                String msg = String.format(
                    "Miss rate spiked: recent %d%% vs baseline %d%%",
                    Math.round(recentRate), Math.round(baselineRate));
                String suggestion = utilization >= HIGH_UTIL_THRESHOLD
                    ? "Cache is nearly full — consider increasing capacity or switching to Adaptive mode."
                    : "High number of unique requests detected — try Adaptive mode to tune eviction.";
                return List.of(new CacheAlert("MISS_SPIKE", msg, suggestion));
            }
        }

        // --- 2. Capacity pressure ---
        if (utilization >= HIGH_UTIL_THRESHOLD && baselineTotal >= MIN_RECENT) {
            return List.of(new CacheAlert("HIGH_UTILIZATION",
                String.format("Cache utilization at %d%% — evictions are happening on most inserts.", Math.round(utilization * 100)),
                "Increase cache.capacity in application.properties or clear stale entries."));
        }

        return List.of();
    }
}
