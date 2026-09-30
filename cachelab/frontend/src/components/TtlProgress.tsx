import { formatDuration } from './ui';

export function TtlProgress({
  ttlMillis, remainingMillis, expired,
}: { ttlMillis: number | null; remainingMillis: number | null; expired: boolean }) {
  if (ttlMillis == null || remainingMillis == null) {
    return <span className="text-xs text-slate-500">no TTL</span>;
  }
  if (expired) {
    return <span className="text-xs font-medium text-rose-400">expired</span>;
  }
  const pct = Math.max(0, Math.min(100, (remainingMillis / ttlMillis) * 100));
  const color = pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="flex w-36 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-12 text-right text-xs tabular-nums text-slate-300">{formatDuration(remainingMillis)}</span>
    </div>
  );
}
