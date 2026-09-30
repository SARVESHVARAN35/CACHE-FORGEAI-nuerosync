import { useState } from 'react';
import { Eraser, Plus, Search, SquareTerminal, X } from 'lucide-react';
import { api } from '../services/api';
import { Card } from './ui';

type Tone = 'hit' | 'miss' | 'info' | 'error';
const TONE: Record<Tone, string> = {
  hit: 'text-emerald-300',
  miss: 'text-rose-300',
  info: 'text-slate-300',
  error: 'text-amber-300',
};

const input =
  'w-full rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 outline-none placeholder:text-slate-600 focus:border-slate-600';
const btn =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700 disabled:opacity-50';

export function ControlPanel({ onDone }: { onDone: () => void }) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [ttl, setTtl] = useState('');
  const [resetStats, setResetStats] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);

  const run = async (fn: () => Promise<{ tone: Tone; text: string }>) => {
    setBusy(true);
    try {
      setMsg(await fn());
    } catch (e) {
      setMsg({ tone: 'error', text: (e as Error).message });
    } finally {
      setBusy(false);
      onDone();
    }
  };

  const needKey = () => {
    if (!key.trim()) throw new Error('Enter a key first.');
    return key.trim();
  };

  const put = () =>
    run(async () => {
      const k = needKey();
      const t = ttl.trim() === '' ? undefined : Number(ttl);
      if (t !== undefined && (Number.isNaN(t) || t < 0)) throw new Error('TTL must be a positive number of seconds.');
      await api.put(k, value, t);
      return { tone: 'info', text: `PUT ${k}${t ? ` (TTL ${t}s)` : ''}` };
    });

  const get = () =>
    run(async () => {
      const k = needKey();
      const r = await api.get(k);
      return r.hit
        ? { tone: 'hit', text: `HIT · ${r.value}` }
        : { tone: 'miss', text: `MISS · "${k}" is not cached (or expired)` };
    });

  const del = () =>
    run(async () => {
      const k = needKey();
      const r = await api.remove(k);
      return { tone: 'info', text: r.removed ? `Removed ${k}` : `${k} was not in the cache` };
    });

  const clear = () =>
    run(async () => {
      await api.clear(resetStats);
      return { tone: 'info', text: resetStats ? 'Cache cleared and stats reset' : 'Cache cleared' };
    });

  return (
    <Card title="Manual operations" icon={<SquareTerminal className="h-4 w-4 text-slate-400" />}>
      <div className="space-y-2">
        <input className={input} placeholder="key" value={key} onChange={(e) => setKey(e.target.value)} />
        <input className={input} placeholder="value" value={value} onChange={(e) => setValue(e.target.value)} />
        <input className={input} placeholder="TTL in seconds (optional)" inputMode="numeric" value={ttl} onChange={(e) => setTtl(e.target.value)} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <button className={btn} disabled={busy} onClick={put}><Plus className="h-3.5 w-3.5" />PUT</button>
        <button className={btn} disabled={busy} onClick={get} title="Records a real hit or miss"><Search className="h-3.5 w-3.5" />GET</button>
        <button className={btn} disabled={busy} onClick={del}><X className="h-3.5 w-3.5" />DELETE</button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button className={`${btn} flex-1`} disabled={busy} onClick={clear}><Eraser className="h-3.5 w-3.5" />Clear cache</button>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <input type="checkbox" checked={resetStats} onChange={(e) => setResetStats(e.target.checked)} />
          reset stats
        </label>
      </div>
      <p className={`mt-3 min-h-[1.25rem] break-all font-mono text-xs ${msg ? TONE[msg.tone] : 'text-slate-600'}`}>
        {msg ? msg.text : 'GET records a real hit or miss.'}
      </p>
    </Card>
  );
}
