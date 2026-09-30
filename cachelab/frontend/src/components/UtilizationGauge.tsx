import { Gauge } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { CacheEntryDto, CacheStats } from '../types/cache';
import { Card, HEAT_STYLE } from './ui';

const EXPIRED = '#64748b';

export function UtilizationGauge({ stats, entries }: { stats: CacheStats; entries: CacheEntryDto[] }) {
  const color = stats.utilization >= 90 ? '#fb7185' : stats.utilization >= 70 ? '#fbbf24' : '#34d399';
  const data = [
    { name: 'Used', value: stats.size },
    { name: 'Free', value: Math.max(0, stats.capacity - stats.size) },
  ];
  const slots = Array.from({ length: stats.capacity }, (_, i) => entries[i]);

  return (
    <Card title="Utilization" icon={<Gauge className="h-4 w-4 text-slate-400" />}>
      <div className="relative h-36">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius="72%" outerRadius="100%" startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
              <Cell fill={color} />
              <Cell fill="#1e293b" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-semibold text-slate-50">{stats.utilization.toFixed(0)}%</span>
          <span className="text-xs text-slate-400">{stats.size}/{stats.capacity} slots</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-xs text-slate-500">Slot map (colored by heat)</div>
        <div className="grid grid-cols-10 gap-1">
          {slots.map((e, i) => (
            <div
              key={e ? e.key : `free-${i}`}
              title={e ? `${e.key} · ${e.status === 'EXPIRED' ? 'expired' : e.heat.toLowerCase()}` : 'free'}
              className={`h-3 rounded-sm ${e ? '' : 'bg-slate-800'}`}
              style={e ? { background: e.status === 'EXPIRED' ? EXPIRED : HEAT_STYLE[e.heat].hex } : undefined}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
          {(['HOT', 'WARM', 'COLD'] as const).map((h) => (
            <span key={h} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm" style={{ background: HEAT_STYLE[h].hex }} />{h.toLowerCase()}
            </span>
          ))}
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm" style={{ background: EXPIRED }} />expired</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-slate-800" />free</span>
        </div>
      </div>
    </Card>
  );
}
