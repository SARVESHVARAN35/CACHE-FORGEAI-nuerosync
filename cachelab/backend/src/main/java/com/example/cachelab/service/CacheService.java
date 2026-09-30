package com.example.cachelab.service;

import com.example.cachelab.cache.CacheImpl;
import com.example.cachelab.cache.EntrySnapshot;
import com.example.cachelab.dto.Dtos.*;
import com.example.cachelab.eviction.EvictionPolicy;
import com.example.cachelab.eviction.LfuPolicy;
import com.example.cachelab.eviction.LruPolicy;
import com.example.cachelab.eviction.PolicyType;
import com.example.cachelab.metrics.CacheMetrics;
import com.example.cachelab.metrics.HealthCalculator;
import com.example.cachelab.service.AdaptiveAdvisor.AdaptiveAdvice;
import com.example.cachelab.service.AnomalyDetector.CacheAlert;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class CacheService {
    private static final long MIN_SWITCH_GAP_MS = 10_000;

    private final CacheImpl<String, String> cache;
    private final CacheMetrics metrics;
    private final AdaptiveAdvisor advisor;
    private final WorkloadComparator comparator;
    private final PrefetchEngine prefetcher;
    private final AnomalyDetector anomalyDetector;
    private final AtomicBoolean simulating = new AtomicBoolean(false);

    private volatile PolicyType selected = PolicyType.LRU;   // what the user picked
    private volatile PolicyType active = PolicyType.LRU;     // engine actually running (LRU or LFU)
    private volatile long lastSwitchAt = 0;

    public CacheService(CacheImpl<String, String> cache, CacheMetrics metrics,
                        AdaptiveAdvisor advisor, WorkloadComparator comparator,
                        PrefetchEngine prefetcher, AnomalyDetector anomalyDetector) {
        this.cache = cache;
        this.metrics = metrics;
        this.advisor = advisor;
        this.comparator = comparator;
        this.prefetcher = prefetcher;
        this.anomalyDetector = anomalyDetector;
    }

    // ---- basic operations ----

    public GetResponse get(String key) {
        Optional<String> v = cache.get(key);

        // Predictive prefetching: record access, get next predicted key
        String predicted = prefetcher.onAccess(key);
        if (predicted != null && !cache.containsKey(predicted)) {
            // Only prefetch if it's not already in cache — we use a dummy value placeholder
            // Real systems would load from the source; here we create a warm sentinel entry
            // so the next real GET on that key is a HIT.
            // We tag value as "__prefetch__" so the dashboard can show it distinctly.
            cache.put(predicted, "__prefetch__", 0);
            prefetcher.recordPrefetch();
        }

        return new GetResponse(key, v.isPresent(), v.orElse(null));
    }

    public void put(String key, String value, Long ttlSeconds) {
        long ttl = (ttlSeconds == null || ttlSeconds <= 0) ? 0 : ttlSeconds * 1000;
        cache.put(key, value == null ? "" : value, ttl);
    }

    public boolean remove(String key) { return cache.remove(key) != null; }

    public StatsDto clear(boolean resetStats) {
        cache.clear();
        if (resetStats) {
            metrics.reset();
            prefetcher.reset();
        }
        return stats();
    }

    // ---- read models ----

    public List<EntryDto> entries() {
        List<EntrySnapshot<String, String>> raw = cache.entries();
        long now = System.currentTimeMillis();
        double avg = raw.stream().filter(e -> !e.expired()).mapToLong(EntrySnapshot::accessCount).average().orElse(0);
        double hotAt = Math.max(3, avg * 1.5);
        double warmAt = Math.max(1, avg);

        List<EntryDto> out = new ArrayList<>(raw.size());
        for (EntrySnapshot<String, String> e : raw) {
            String heat = e.expired() ? "COLD" : e.accessCount() >= hotAt ? "HOT" : e.accessCount() >= warmAt ? "WARM" : "COLD";
            boolean hasTtl = e.ttlMillis() > 0;
            out.add(new EntryDto(e.key(), e.value(), e.accessCount(), heat,
                    hasTtl ? e.ttlMillis() : null,
                    hasTtl ? Math.max(0, e.expiresAt() - now) : null,
                    e.lastAccessedAt(), e.expired() ? "EXPIRED" : "ACTIVE"));
        }
        out.sort(Comparator.comparingLong(EntryDto::accessCount).reversed().thenComparing(EntryDto::key));
        return out;
    }

    public StatsDto stats() {
        long h = metrics.getHits(), m = metrics.getMisses(), p = metrics.getPuts();
        long ev = metrics.getEvictions(), ex = metrics.getExpirations();
        int size = cache.size(), cap = cache.capacity();
        long lookups = h + m;
        double hitRate = lookups == 0 ? 0 : CacheMetrics.round1(h * 100.0 / lookups);
        double missRate = lookups == 0 ? 0 : CacheMetrics.round1(100 - hitRate);
        double evRate = p == 0 ? 0 : CacheMetrics.round1(ev * 100.0 / p);
        double exRate = p == 0 ? 0 : CacheMetrics.round1(ex * 100.0 / p);
        double util = CacheMetrics.round1(size * 100.0 / cap);
        AdaptiveAdvice advice = advisor.analyze(metrics.recentLookups(300), active);

        // Anomaly detection — runs on every stats call (lightweight)
        List<CacheAlert> alerts = anomalyDetector.analyze(
                metrics.recentLookups(250), util / 100.0);

        return new StatsDto(h, m, lookups, p, ev, ex, hitRate, missRate, evRate, exRate,
                size, cap, util, selected.name(), active.name(), simulating.get(),
                HealthCalculator.calculate(h, m, p, ev, ex, size, cap), advice,
                alerts,
                prefetcher.getTotalPrefetches(), prefetcher.getTrackedKeys(),
                System.currentTimeMillis());
    }

    public SnapshotDto snapshot() {
        return new SnapshotDto(stats(), entries(), metrics.recent(40));
    }

    // ---- policy selection ----

    public synchronized StatsDto setPolicy(PolicyType type) {
        selected = type;
        if (type == PolicyType.ADAPTIVE) evaluateAdaptive(true);
        else applyActive(type);
        return stats();
    }

    @Scheduled(fixedDelay = 5000)
    public synchronized void adaptiveTick() { evaluateAdaptive(false); }

    private void evaluateAdaptive(boolean force) {
        if (selected != PolicyType.ADAPTIVE) return;
        AdaptiveAdvice advice = advisor.analyze(metrics.recentLookups(300), active);
        PolicyType rec = PolicyType.valueOf(advice.recommended());
        if (rec != active && (force || System.currentTimeMillis() - lastSwitchAt >= MIN_SWITCH_GAP_MS)) {
            applyActive(rec);
        }
    }

    private void applyActive(PolicyType type) {
        if (type == active) return;
        cache.setPolicy(newPolicy(type));
        active = type;
        lastSwitchAt = System.currentTimeMillis();
    }

    private EvictionPolicy<String> newPolicy(PolicyType type) {
        if (type == PolicyType.LFU) return new LfuPolicy<String>();
        return new LruPolicy<String>();
    }

    // ---- housekeeping ----

    @Scheduled(fixedDelayString = "${cache.sweep-interval-ms:3000}")
    public void sweepExpired() { cache.sweep(); }

    // ---- workloads ----

    public CompareResult compare(WorkloadRequest req) {
        return comparator.compare(req, cache.capacity());
    }

    /** Fires generated traffic at the live cache in the background so the dashboard shows it happening. */
    public SimulateResponse simulate(WorkloadRequest req) {
        int requests = WorkloadComparator.clamp(req.requests() == null ? 600 : req.requests(), 1, 5000);
        int keySpace = WorkloadComparator.clamp(req.keySpace() == null ? 100 : req.keySpace(), 2, 10_000);
        String pattern = WorkloadComparator.normalize(req.pattern());
        long ttlMillis = (req.ttlSeconds() == null || req.ttlSeconds() <= 0) ? 0 : req.ttlSeconds() * 1000;

        if (!simulating.compareAndSet(false, true)) return new SimulateResponse(false, 0, pattern);

        List<String> sequence = comparator.generate(pattern, requests, keySpace, cache.capacity(), new Random());
        Thread t = new Thread(() -> {
            try {
                for (String key : sequence) {
                    get(key); // use get() so prefetch engine also learns from simulated traffic
                    if (cache.get(key).isEmpty()) cache.put(key, "value-" + key, ttlMillis);
                    Thread.sleep(3);
                }
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } finally {
                simulating.set(false);
            }
        }, "cache-simulator");
        t.setDaemon(true);
        t.start();
        return new SimulateResponse(true, requests, pattern);
    }

    /**
     * Executes a multi-threaded concurrent burst test where N threads simultaneously read and write to the cache.
     * Demonstrates lock contention management, thread safety, and execution throughput (ops/sec).
     */
    public ConcurrentResult runConcurrentBurst(ConcurrentRequest req) {
        int threads = WorkloadComparator.clamp(req.threads() == null ? 8 : req.threads(), 1, 64);
        int perThread = WorkloadComparator.clamp(req.requestsPerThread() == null ? 1000 : req.requestsPerThread(), 10, 50_000);
        double putRatio = req.putRatio() == null ? 0.3 : Math.max(0.0, Math.min(1.0, req.putRatio()));
        int keySpace = WorkloadComparator.clamp(req.keySpace() == null ? 100 : req.keySpace(), 2, 5000);

        long hitsBefore = metrics.getHits();
        long missesBefore = metrics.getMisses();
        long evictionsBefore = metrics.getEvictions();

        ExecutorService executor = Executors.newFixedThreadPool(threads);
        long start = System.nanoTime();

        CountDownLatch latch = new CountDownLatch(threads);
        for (int t = 0; t < threads; t++) {
            final int threadId = t;
            executor.submit(() -> {
                Random rnd = new Random(threadId * 31L + System.currentTimeMillis());
                for (int i = 0; i < perThread; i++) {
                    String key = "conc-key-" + rnd.nextInt(keySpace);
                    if (rnd.nextDouble() < putRatio) {
                        put(key, "val-" + threadId + "-" + i, null);
                    } else {
                        get(key);
                    }
                }
                latch.countDown();
            });
        }

        try {
            latch.await(30, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } finally {
            executor.shutdownNow();
        }

        long elapsedNs = System.nanoTime() - start;
        double durationMs = CacheMetrics.round1(elapsedNs / 1_000_000.0);
        int totalRequests = threads * perThread;
        double opsPerSec = durationMs <= 0 ? 0 : CacheMetrics.round1((totalRequests * 1000.0) / durationMs);

        long hits = metrics.getHits() - hitsBefore;
        long misses = metrics.getMisses() - missesBefore;
        long evictions = metrics.getEvictions() - evictionsBefore;

        return new ConcurrentResult(threads, totalRequests, durationMs, opsPerSec, hits, misses, evictions);
    }
}
