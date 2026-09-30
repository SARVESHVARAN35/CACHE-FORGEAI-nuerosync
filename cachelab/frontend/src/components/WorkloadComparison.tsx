import { useState } from 'react';
import { Play, Scale, Trophy } from 'lucide-react';
import { api } from '../services/api';
import type { CompareResult, Pattern, PolicyResult } from '../types/cache';
import { Badge, Card, POLICY_STYLE } from './ui';

const PATTERNS: { id: Pattern; label: string; hint: string }[] = [
  { id: 'ZIPF', label: 'Skewed (hot keys)', hint: 'A few keys receive most of the traffic.' },
  { id: 'UNIFORM', label: 'Uniform random', hint: 'Every key is equally likely.' },
  { id: 'SCAN', label: 'Hot set + scan', hint: 'Half hot keys, half a sequential scan.' },
];

const field =
  'w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 outline-none focus:border-slate-600';
const label = 'mb-1 block text-[11px] text-slate-500';

function num(s: string, fallback: number): number {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function Column({ r, winner }: { r: PolicyResult; winner: boolean }) {
  const s = POLICY_STYLE[r.policy];
  return (
    <div className={`rounded-xl border p-4 ${winner ? s.selected : 'border-slate-800'}`}>
      <div className="flex items-center justify-between">
        <Badge className={s.badge}>{r.policy}</Badge>
        {winner && <Trophy className="h-4 w-4 text-amber-400" />}
      </div>
      <div className="mt-3 text-3xl font-semibold text-slate-50">{r.hitRate.toFixed(1)}%</div>
      <div className="text-xs text-slate-500">hit rate</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${r.hitRate}%`, background: s.hex }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div><dt className="text-slate-500">Hits</dt><dd className="text-slate-200">{r.hits.toLocaleString()}</dd></div>
        <div><dt className="text-slate-500">Misses</dt><dd className="text-slate-200">{r.misses.toLocaleString()}</dd></div>
        <div><dt className="text-slate-500">Evictions</dt><dd className="text-slate-200">{r.evictions.toLocaleString()}</dd></div>
      </dl>
    </div>
  );
}

export function WorkloadComparison({
  simulating, onLiveStarted,
}: { simulating: boolean; onLiveStarted: () => void }) {
  const [pattern, setPattern] = useState<Pattern>('ZIPF');
  const [requests, setRequests] = useState('5000');
  const [keySpace, setKeySpace] = useState('200');
  const [ttl, setTtl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compare = async () => {
    setLoading(true);
    setError(null);
    try {
      setResult(await api.compare({ pattern, requests: num(requests, 5000), keySpace: num(keySpace, 200) }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const live = async () => {
    setError(null);
    try {
      const r = await api.simulate({
        pattern,
        requests: Math.min(5000, num(requests, 600)),
        keySpace: num(keySpace, 100),
        ttlSeconds: ttl.trim() === '' ? undefined : num(ttl, 0),
      });
      if (!r.started) setError('A live simulation is already running.');
      onLiveStarted();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const hint = PATTERNS.find((p) => p.id === pattern)?.hint;

  return (
    <Card title="Workload comparison: LRU vs LFU vs Adaptive" icon={<Scale className="h-4 w-4 text-slate-400" />}>
      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div>
          <div className="space-y-3">
            <div>
              <label className={label}>Access pattern</label>
              <select className={field} value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
                {PATTERNS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Requests</label>
                <input className={field} inputMode="numeric" value={requests} onChange={(e) => setRequests(e.target.value)} />
              </div>
              <div>
                <label className={label}>Key space</label>
                <input className={field} inputMode="numeric" value={keySpace} onChange={(e) => setKeySpace(e.target.value)} />
              </div>
            </div>
            <div>
              <label className={label}>TTL for live traffic (seconds, optional)</label>
              <input className={field} inputMode="numeric" placeholder="none" value={ttl} onChange={(e) => setTtl(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={compare} disabled={loading}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-500 disabled:opacity-50">
              <Scale className="h-3.5 w-3.5" />{loading ? 'Running…' : 'Compare'}
            </button>
            <button onClick={live} disabled={simulating}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50">
              <Play className="h-3.5 w-3.5" />{simulating ? 'Running live…' : 'Send to live cache'}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Compare replays one identical request sequence on isolated LRU, LFU, and Adaptive caches. Live traffic hits the real cache and shows up in the charts.
          </p>
          {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}
        </div>

        <div>
          {!result ? (
            <div className="flex h-full min-h-[180px] items-center justify-center rounded-xl border border-dashed border-slate-800 text-sm text-slate-500">
              Run a comparison to see real hit rates side by side.
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <span>
                  {PATTERNS.find((p) => p.id === result.pattern)?.label} · {result.requests.toLocaleString()} requests ·
                  {' '}{result.keySpace} keys · capacity {result.capacity}
                </span>
                <Badge className={result.winner === 'TIE' ? 'bg-slate-500/10 text-slate-300 ring-slate-500/30' : (POLICY_STYLE[result.winner as PolicyType]?.badge || 'bg-slate-500/10 text-slate-300')}>
                  {result.winner === 'TIE' ? 'Tie (within 0.5 pts)' : `${result.winner} wins by ${Math.abs(result.lfuAdvantage).toFixed(1)} pts`}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Column r={result.lru} winner={result.winner === 'LRU'} />
                <Column r={result.lfu} winner={result.winner === 'LFU'} />
                {result.adaptive && <Column r={result.adaptive} winner={result.winner === 'ADAPTIVE'} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
