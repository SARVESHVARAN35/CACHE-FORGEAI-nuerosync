import { useState } from 'react';
import { Cpu, Zap } from 'lucide-react';
import { api } from '../services/api';
import type { ConcurrentResult } from '../types/cache';
import { Card, Tooltip } from './ui';

export function ConcurrentStressTest({ onDone }: { onDone: () => void }) {
  const [threads, setThreads] = useState('8');
  const [perThread, setPerThread] = useState('1000');
  const [putRatio, setPutRatio] = useState('0.3');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConcurrentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.concurrent({
        threads: Number(threads) || 8,
        requestsPerThread: Number(perThread) || 1000,
        putRatio: Number(putRatio) || 0.3,
      });
      setResult(res);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const field =
    'w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-slate-600';
  const label = 'mb-1 block text-[11px] text-slate-500';

  return (
    <Card
      title="Multithreaded Concurrent Burst"
      icon={<Cpu className="h-4 w-4 text-cyan-400" />}
    >
      <p className="mb-3 text-xs text-slate-400">
        Fires parallel Java worker threads performing concurrent GET & PUT operations guarded by ReentrantLock.
      </p>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={label}>
            <Tooltip text="Number of parallel worker threads running simultaneously.">
              <span className="cursor-help border-b border-dotted border-slate-600">Threads</span>
            </Tooltip>
          </label>
          <select className={field} value={threads} onChange={(e) => setThreads(e.target.value)}>
            <option value="4">4 threads</option>
            <option value="8">8 threads</option>
            <option value="16">16 threads</option>
            <option value="32">32 threads</option>
          </select>
        </div>
        <div>
          <label className={label}>Ops / Thread</label>
          <input className={field} inputMode="numeric" value={perThread} onChange={(e) => setPerThread(e.target.value)} />
        </div>
        <div>
          <label className={label}>PUT Ratio</label>
          <select className={field} value={putRatio} onChange={(e) => setPutRatio(e.target.value)}>
            <option value="0.1">10% PUT / 90% GET</option>
            <option value="0.3">30% PUT / 70% GET</option>
            <option value="0.5">50% PUT / 50% GET</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <button
          onClick={runTest}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
        >
          <Zap className="h-3.5 w-3.5" />
          {loading ? 'Executing Concurrent Threads…' : 'Run Multithreaded Burst'}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-amber-300">{error}</p>}

      {result && (
        <div className="mt-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 text-xs">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
            <span className="font-semibold text-cyan-300">Burst Completed</span>
            <span className="text-slate-400">{result.durationMs.toFixed(1)} ms</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-500">Throughput</span>
              <p className="text-sm font-semibold text-slate-100">{result.opsPerSec.toLocaleString()} ops/sec</p>
            </div>
            <div>
              <span className="text-slate-500">Total Ops</span>
              <p className="text-sm font-semibold text-slate-100">{result.totalRequests.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500">Hits / Misses</span>
              <p className="text-slate-200">{result.hits.toLocaleString()} / {result.misses.toLocaleString()}</p>
            </div>
            <div>
              <span className="text-slate-500">Evictions</span>
              <p className="text-slate-200">{result.evictions.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
