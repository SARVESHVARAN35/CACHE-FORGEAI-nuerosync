import { Activity } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import type { HistoryPoint } from '../hooks/useCacheStream';
import type { CacheStats } from '../types/cache';
import { Badge, Card, HIT_BADGE, MISS_BADGE } from './ui';

export function HitMissChart({ history, stats }: { history: HistoryPoint[]; stats: CacheStats }) {
  const hasTraffic = history.some((p) => p.hits > 0 || p.misses > 0);

  return (
    <Card
      title="Live hits vs misses (per second)"
      icon={<Activity className="h-4 w-4 text-slate-400" />}
      className="lg:col-span-2"
      action={
        <div className="flex gap-2">
          <Badge className={HIT_BADGE}>Hit {stats.hitRate.toFixed(1)}%</Badge>
          <Badge className={MISS_BADGE}>Miss {stats.missRate.toFixed(1)}%</Badge>
        </div>
      }
    >
      <div className="relative h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="hitFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="missFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fb7185" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} interval="preserveStartEnd" minTickGap={48} />
            <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
            <RTooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="hits" name="Hits" stroke="#34d399" strokeWidth={2} fill="url(#hitFill)" isAnimationActive={false} />
            <Area type="monotone" dataKey="misses" name="Misses" stroke="#fb7185" strokeWidth={2} fill="url(#missFill)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
        {!hasTraffic && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            No lookups yet. Send a GET or run a workload below.
          </div>
        )}
      </div>
    </Card>
  );
}
