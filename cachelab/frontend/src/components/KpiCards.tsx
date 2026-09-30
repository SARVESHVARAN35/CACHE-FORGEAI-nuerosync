import { Ban, Database, Gauge, Target, Timer, Trash2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CacheStats } from '../types/cache';
import { Tooltip } from './ui';

interface Kpi {
  label: string;
  value: string;
  sub: string;
  tip: string;
  Icon: LucideIcon;
  tone: string;
  bar?: { pct: number; color: string };
}

export function KpiCards({ stats }: { stats: CacheStats }) {
  const util = stats.utilization;
  const utilTone = util >= 90 ? 'rose' : util >= 70 ? 'amber' : 'emerald';
  const toneIcon: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400',
    rose: 'bg-rose-500/10 text-rose-400',
    amber: 'bg-amber-500/10 text-amber-400',
    blue: 'bg-blue-500/10 text-blue-400',
    slate: 'bg-slate-500/15 text-slate-300',
  };
  const barColor: Record<string, string> = { emerald: '#34d399', rose: '#fb7185', amber: '#fbbf24' };

  const kpis: Kpi[] = [
    {
      label: 'Hit Rate', value: `${stats.hitRate.toFixed(1)}%`, sub: `${stats.hits.toLocaleString()} hits`,
      tip: 'Share of GET lookups served from the cache.', Icon: Target, tone: 'emerald',
      bar: { pct: stats.hitRate, color: '#34d399' },
    },
    {
      label: 'Miss Rate', value: `${stats.missRate.toFixed(1)}%`, sub: `${stats.misses.toLocaleString()} misses`,
      tip: 'Share of GET lookups that were not found or had expired.', Icon: Ban, tone: 'rose',
      bar: { pct: stats.missRate, color: '#fb7185' },
    },
    {
      label: 'Cache Size', value: `${stats.size} / ${stats.capacity}`, sub: 'live entries',
      tip: 'Non-expired entries currently stored, out of total capacity.', Icon: Database, tone: 'blue',
    },
    {
      label: 'Utilization', value: `${util.toFixed(0)}%`, sub: util >= 90 ? 'nearly full' : 'of capacity',
      tip: 'Size divided by capacity. Above 90% the cache starts evicting on most inserts.', Icon: Gauge, tone: utilTone,
      bar: { pct: util, color: barColor[utilTone] },
    },
    {
      label: 'Evictions', value: stats.evictions.toLocaleString(), sub: `${stats.evictionRate.toFixed(1)}% of puts`,
      tip: `Live entries removed to make room (policy: ${stats.activePolicy}).`, Icon: Trash2, tone: 'amber',
    },
    {
      label: 'Expirations', value: stats.expirations.toLocaleString(), sub: `${stats.expirationRate.toFixed(1)}% of puts`,
      tip: 'Entries removed because their TTL elapsed. Independent of the eviction policy.', Icon: Timer, tone: 'slate',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between">
            <Tooltip text={k.tip}>
              <span className="cursor-help border-b border-dotted border-slate-600 text-xs font-medium text-slate-400">{k.label}</span>
            </Tooltip>
            <span className={`rounded-lg p-1.5 ${toneIcon[k.tone]}`}><k.Icon className="h-4 w-4" /></span>
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-50">{k.value}</div>
          <div className="mt-1 text-xs text-slate-500">{k.sub}</div>
          {k.bar && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, k.bar.pct)}%`, background: k.bar.color }} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
