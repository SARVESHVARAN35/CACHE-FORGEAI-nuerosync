import { HeartPulse } from 'lucide-react';
import type { CacheStats, HealthStatus } from '../types/cache';
import { Badge, Card } from './ui';

const STYLE: Record<HealthStatus, { text: string; bar: string; badge: string; label: string }> = {
  HEALTHY: { text: 'text-emerald-400', bar: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30', label: 'Healthy' },
  WARNING: { text: 'text-amber-400', bar: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-300 ring-amber-500/30', label: 'Warning' },
  CRITICAL: { text: 'text-rose-400', bar: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-300 ring-rose-500/30', label: 'Critical' },
};

export function HealthIndicator({ stats }: { stats: CacheStats }) {
  const { health } = stats;
  const s = STYLE[health.status];
  const rows: [string, string][] = [
    ['Hit rate', stats.lookups === 0 ? 'no lookups yet' : `${stats.hitRate.toFixed(1)}%`],
    ['Utilization', `${stats.utilization.toFixed(0)}%`],
    ['Eviction rate', `${stats.evictionRate.toFixed(1)}% of puts`],
    ['Expiration rate', `${stats.expirationRate.toFixed(1)}% of puts`],
  ];

  return (
    <Card
      title="Cache health"
      icon={<HeartPulse className="h-4 w-4 text-slate-400" />}
      action={<Badge className={s.badge}>{s.label}</Badge>}
    >
      <div className="flex items-end gap-2">
        <span className={`text-5xl font-semibold tracking-tight ${s.text}`}>{health.score}</span>
        <span className="pb-1.5 text-sm text-slate-500">/ 100</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all duration-500 ${s.bar}`} style={{ width: `${health.score}%` }} />
      </div>
      <dl className="mt-4 space-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-slate-300">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-slate-800 pt-3 text-xs">
        {health.issues.length === 0 ? (
          <p className="text-emerald-300/80">All signals are within normal range.</p>
        ) : (
          <ul className="space-y-1">
            {health.issues.map((i) => (
              <li key={i} className="flex items-start gap-2 text-amber-300">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                {i}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
