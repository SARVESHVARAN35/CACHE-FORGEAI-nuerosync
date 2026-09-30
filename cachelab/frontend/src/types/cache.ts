export type PolicyType = 'LRU' | 'LFU' | 'ADAPTIVE';
export type ActivePolicy = 'LRU' | 'LFU' | 'ADAPTIVE';
export type Heat = 'HOT' | 'WARM' | 'COLD';
export type EntryStatus = 'ACTIVE' | 'EXPIRED';
export type EventType = 'HIT' | 'MISS' | 'PUT' | 'EVICTION' | 'EXPIRATION';
export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL';
export type Pattern = 'ZIPF' | 'UNIFORM' | 'SCAN';

export interface HealthReport {
  score: number;
  status: HealthStatus;
  issues: string[];
}

export interface AdaptiveAdvice {
  recommended: ActivePolicy;
  reason: string;
  skewPercent: number;
  thresholdPercent: number;
  sampleSize: number;
  minSamples: number;
  distinctKeys: number;
}

export interface CacheAlert {
  type: string;       // MISS_SPIKE | HIGH_UTILIZATION
  message: string;
  suggestion: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  lookups: number;
  puts: number;
  evictions: number;
  expirations: number;
  hitRate: number;
  missRate: number;
  evictionRate: number;
  expirationRate: number;
  size: number;
  capacity: number;
  utilization: number;
  policy: PolicyType;
  activePolicy: ActivePolicy;
  simulating: boolean;
  health: HealthReport;
  advice: AdaptiveAdvice;
  alerts: CacheAlert[];
  prefetches: number;
  trackedPrefetchKeys: number;
  timestamp: number;
}

export interface CacheEntryDto {
  key: string;
  value: string;
  accessCount: number;
  heat: Heat;
  ttlMillis: number | null;
  remainingMillis: number | null;
  lastAccessedAt: number;
  status: EntryStatus;
}

export interface ActivityEvent {
  id: number;
  timestamp: number;
  type: EventType;
  key: string;
  detail: string | null;
}

export interface Snapshot {
  stats: CacheStats;
  entries: CacheEntryDto[];
  events: ActivityEvent[];
}

export interface GetResponse {
  key: string;
  hit: boolean;
  value: string | null;
}

export interface RemoveResponse {
  key: string;
  removed: boolean;
}

export interface WorkloadRequest {
  requests?: number;
  keySpace?: number;
  pattern?: Pattern;
  capacity?: number;
  ttlSeconds?: number;
}

export interface PolicyResult {
  policy: string;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

export interface CompareResult {
  pattern: Pattern;
  requests: number;
  keySpace: number;
  capacity: number;
  lru: PolicyResult;
  lfu: PolicyResult;
  adaptive: PolicyResult;
  winner: string;
  lfuAdvantage: number;
}

export interface SimulateResponse {
  started: boolean;
  requests: number;
  pattern: Pattern;
}

export interface ConcurrentRequest {
  threads?: number;
  requestsPerThread?: number;
  putRatio?: number;
  keySpace?: number;
}

export interface ConcurrentResult {
  threads: number;
  totalRequests: number;
  durationMs: number;
  opsPerSec: number;
  hits: number;
  misses: number;
  evictions: number;
}
