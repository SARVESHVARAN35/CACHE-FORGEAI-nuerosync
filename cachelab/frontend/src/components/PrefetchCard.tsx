import { Zap } from 'lucide-react';
import type { CacheStats } from '../types/cache';
import { Card, Tooltip } from './ui';

export function PrefetchCard({ stats }: { stats: CacheStats }) {
  const { prefetches, trackedPrefetchKeys } = stats;
  const noData = trackedPrefetchKeys === 0;

  return (
    <Card
      title="Predictive Prefetch"
      icon={<Zap className="h-4 w-4 text-violet-400" />}
    >
      {/* Visual pill showing prefetch count */}
      <div className="flex items-end gap-2">
        <span className="text-5xl font-semibold tracking-tight text-violet-400">
          {prefetches.toLocaleString()}
        </span>
        <span className="pb-1.5 text-sm text-slate-500">prefetches</span>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-violet-500 transition-all duration-500"
          style={{ width: noData ? '0%' : `${Math.min(100, (prefetches / Math.max(1, stats.lookups)) * 100 * 3)}%` }}
        />
      </div>

      <dl className="mt-4 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <dt className="text-slate-500">
            <Tooltip text="How many distinct 'A→B' access sequences the engine has observed and is tracking.">
              <span className="cursor-help border-b border-dotted border-slate-600">Tracked sequences</span>
            </Tooltip>
          </dt>
          <dd className="text-slate-300">{trackedPrefetchKeys}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Total lookups</dt>
          <dd className="text-slate-300">{stats.lookups.toLocaleString()}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-slate-800 pt-3 text-[11px] text-slate-500">
        {noData ? (
          <p>Run a workload or GET some keys to teach the prefetcher access patterns.</p>
        ) : prefetches === 0 ? (
          <p>Observing patterns… prefetches will fire once confidence is high enough (≥3 observations of A→B).</p>
        ) : (
          <p>
            After seeing key A accessed repeatedly before key B, the engine pre-loads B so the next request is a guaranteed HIT.
          </p>
        )}
      </div>
    </Card>
  );
}
