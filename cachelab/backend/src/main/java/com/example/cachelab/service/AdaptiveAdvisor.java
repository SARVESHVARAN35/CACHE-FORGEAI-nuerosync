package com.example.cachelab.service;

import com.example.cachelab.eviction.PolicyType;
import com.example.cachelab.metrics.ActivityEvent;
import com.example.cachelab.metrics.CacheMetrics;
import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Rule-based analysis of real recent lookups (no AI).
 * If the top 20% of keys receive >= 55% of lookups, access is frequency-skewed -> LFU; otherwise -> LRU.
 */
@Component
public class AdaptiveAdvisor {
    public static final int MIN_SAMPLES = 20;
    public static final double SKEW_THRESHOLD = 0.55;

    public record AdaptiveAdvice(String recommended, String reason, double skewPercent, double thresholdPercent,
                                 int sampleSize, int minSamples, int distinctKeys) {}

    public AdaptiveAdvice analyze(List<ActivityEvent> lookups, PolicyType current) {
        int sample = lookups.size();
        Map<String, Integer> counts = new HashMap<>();
        for (ActivityEvent e : lookups) counts.merge(e.key(), 1, Integer::sum);
        int distinct = counts.size();
        String fallback = current == PolicyType.LFU ? "LFU" : "LRU";
        double threshold = SKEW_THRESHOLD * 100;

        if (sample < MIN_SAMPLES) {
            return new AdaptiveAdvice(fallback,
                    "Collecting data: need at least " + MIN_SAMPLES + " lookups (" + sample + " so far).",
                    0, threshold, sample, MIN_SAMPLES, distinct);
        }

        List<Integer> sorted = new ArrayList<>(counts.values());
        sorted.sort(Comparator.reverseOrder());
        int topN = Math.max(1, (int) Math.ceil(distinct * 0.2));
        int top = 0;
        for (int i = 0; i < topN; i++) top += sorted.get(i);
        double skew = (double) top / sample;
        double skewPct = CacheMetrics.round1(skew * 100);

        if (skew >= SKEW_THRESHOLD) {
            return new AdaptiveAdvice("LFU",
                    "Access is frequency-skewed: the top 20% of keys receive " + Math.round(skewPct)
                            + "% of lookups, so LFU protects the hot keys.",
                    skewPct, threshold, sample, MIN_SAMPLES, distinct);
        }
        return new AdaptiveAdvice("LRU",
                "Access is spread out or shifting: the top 20% of keys receive only " + Math.round(skewPct)
                        + "% of lookups, so LRU (recency) adapts better.",
                skewPct, threshold, sample, MIN_SAMPLES, distinct);
    }
}
