import { useMemo, useState } from 'react';
import { List, Search, X } from 'lucide-react';
import type { CacheEntryDto } from '../types/cache';
import { TtlProgress } from './TtlProgress';
import { Badge, Card, HEAT_STYLE, HIT_BADGE, MISS_BADGE, formatDuration, timeAgo } from './ui';

export function EntriesTable({
  entries, onDelete,
}: { entries: CacheEntryDto[]; onDelete: (key: string) => void }) {
  const [q, setQ] = useState('');
  const now = Date.now();

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter(
      (e) =>
        e.key.toLowerCase().includes(s) ||
        e.value.toLowerCase().includes(s) ||
        e.heat.toLowerCase().includes(s) ||
        e.status.toLowerCase().includes(s),
    );
  }, [entries, q]);

  return (
    <Card
      title={`Cache entries (${filtered.length}${filtered.length !== entries.length ? ` of ${entries.length}` : ''})`}
      icon={<List className="h-4 w-4 text-slate-400" />}
      className="xl:col-span-2"
      action={
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search key, value, hot, expired…"
            className="w-56 rounded-lg border border-slate-800 bg-slate-950/60 py-1.5 pl-8 pr-3 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-600"
          />
        </label>
      }
    >
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full min-w-[820px] text-left text-xs">
          <thead className="sticky top-0 z-10 bg-slate-900 text-slate-500">
            <tr>
              {['Key', 'Value', 'Accesses', 'Heat', 'TTL', 'Remaining TTL', 'Last accessed', 'Status', ''].map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-10 text-center text-slate-500">
                  {entries.length === 0 ? 'Cache is empty. PUT a key or run a workload.' : 'No entries match your search.'}
                </td>
              </tr>
            )}
            {filtered.map((e) => {
              const heat = HEAT_STYLE[e.heat];
              const expired = e.status === 'EXPIRED';
              return (
                <tr key={e.key} className={`hover:bg-slate-800/30 ${expired ? 'opacity-60' : ''}`}>
                  <td className="px-2 py-2 font-mono text-slate-100">{e.key}</td>
                  <td className="max-w-[180px] truncate px-2 py-2 text-slate-400" title={e.value}>{e.value}</td>
                  <td className="px-2 py-2 tabular-nums text-slate-200">{e.accessCount}</td>
                  <td className="px-2 py-2">
                    <Badge className={heat.badge}><heat.Icon className="h-3 w-3" />{e.heat}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-400">{e.ttlMillis == null ? '∞' : formatDuration(e.ttlMillis)}</td>
                  <td className="px-2 py-2">
                    <TtlProgress ttlMillis={e.ttlMillis} remainingMillis={e.remainingMillis} expired={expired} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-slate-400">{timeAgo(e.lastAccessedAt, now)}</td>
                  <td className="px-2 py-2">
                    <Badge className={expired ? MISS_BADGE : HIT_BADGE}>{e.status}</Badge>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button onClick={() => onDelete(e.key)} title="Remove entry" className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
