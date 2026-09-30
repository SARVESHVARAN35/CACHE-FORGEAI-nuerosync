import { Clock, Repeat, Shuffle, SlidersHorizontal } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { CacheStats, PolicyType } from '../types/cache';
import { Badge, Card, POLICY_STYLE } from './ui';

const ICONS: Record<PolicyType, LucideIcon> = { LRU: Clock, LFU: Repeat, ADAPTIVE: Shuffle };
const OPTIONS: PolicyType[] = ['LRU', 'LFU', 'ADAPTIVE'];

export function PolicySelector({
  stats, busy, onChange,
}: { stats: CacheStats; busy: boolean; onChange: (p: PolicyType) => void }) {
  const { advice } = stats;
  const enough = advice.sampleSize >= advice.minSamples;
  const differs = enough && advice.recommended !== stats.activePolicy;

  return (
    <Card title="Eviction policy" icon={<SlidersHorizontal className="h-4 w-4 text-slate-400" />}>
      <div role="radiogroup" className="space-y-2">
        {OPTIONS.map((p) => {
          const s = POLICY_STYLE[p];
          const Icon = ICONS[p];
          const on = stats.policy === p;
          return (
            <button
              key={p}
              role="radio"
              aria-checked={on}
              disabled={busy}
              onClick={() => !on && onChange(p)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition disabled:opacity-60 ${
                on ? s.selected : 'border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
              }`}
            >
              <span className={`mt-0.5 rounded-lg p-1.5 ring-1 ring-inset ${s.badge}`}><Icon className="h-4 w-4" /></span>
              <span className="flex-1">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                  {s.label}
                  {on && p === 'ADAPTIVE' && <Badge className={POLICY_STYLE[stats.activePolicy].badge}>running {stats.activePolicy}</Badge>}
                  {on && p !== 'ADAPTIVE' && <Badge className={s.badge}>active</Badge>}
                </span>
                <span className="mt-0.5 block text-xs text-slate-400">{s.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Workload analysis</span>
          <Badge className={POLICY_STYLE[advice.recommended].badge}>suggests {advice.recommended}</Badge>
        </div>
        <p className="mt-2 text-slate-300">{advice.reason}</p>
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-slate-500">
            <span>Top-20% key share</span>
            <span>{advice.skewPercent.toFixed(0)}% (LFU above {advice.thresholdPercent.toFixed(0)}%)</span>
          </div>
          <div className="relative h-1.5 rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.min(100, advice.skewPercent)}%` }} />
            <div className="absolute top-[-3px] h-3 w-px bg-slate-400" style={{ left: `${advice.thresholdPercent}%` }} />
          </div>
        </div>
        <p className="mt-2 text-slate-500">
          Based on the last {advice.sampleSize} lookups · {advice.distinctKeys} distinct keys
        </p>
        {differs && stats.policy !== 'ADAPTIVE' && (
          <p className="mt-2 text-amber-300">Choose Adaptive to let the cache switch to {advice.recommended} automatically.</p>
        )}
      </div>
    </Card>
  );
}
