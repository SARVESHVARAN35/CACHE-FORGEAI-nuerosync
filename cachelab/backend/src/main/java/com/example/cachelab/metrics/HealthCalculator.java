package com.example.cachelab.metrics;

import java.util.ArrayList;
import java.util.List;

/** Health = 100 minus penalties: hit rate (45), eviction rate (30), expiration rate (15), utilization (10). */
public final class HealthCalculator {
    public record HealthReport(int score, String status, List<String> issues) {}

    private HealthCalculator() {}

    public static HealthReport calculate(long hits, long misses, long puts, long evictions,
                                         long expirations, int size, int capacity) {
        long lookups = hits + misses;
        double hitRate = lookups == 0 ? 1.0 : (double) hits / lookups;
        double util = capacity == 0 ? 0 : (double) size / capacity;
        double evRate = puts == 0 ? 0 : Math.min(1.0, (double) evictions / puts);
        double exRate = puts == 0 ? 0 : Math.min(1.0, (double) expirations / puts);

        double penalty = (lookups == 0 ? 0 : (1 - hitRate) * 45)
                + (util > 0.9 ? Math.min(1, (util - 0.9) / 0.1) * 10 : 0)
                + evRate * 30
                + exRate * 15;
        int score = (int) Math.round(Math.max(0, 100 - penalty));
        String status = score >= 75 ? "HEALTHY" : score >= 50 ? "WARNING" : "CRITICAL";

        List<String> issues = new ArrayList<>();
        if (lookups >= 10 && hitRate < 0.6) issues.add("Low hit rate (" + pct(hitRate) + "%)");
        if (util > 0.9) issues.add("Cache is nearly full (" + pct(util) + "% utilization)");
        if (evRate > 0.3) issues.add("High eviction rate (" + pct(evRate) + "% of puts)");
        if (exRate > 0.3) issues.add("Many entries expire (" + pct(exRate) + "% of puts)");
        return new HealthReport(score, status, issues);
    }

    private static long pct(double v) { return Math.round(v * 100); }
}
