import { useState } from 'react';
import { Layers, Wifi, WifiOff } from 'lucide-react';
import { ActivityFeed } from '../components/ActivityFeed';
import { AnomalyBanner } from '../components/AnomalyBanner';
import { ControlPanel } from '../components/ControlPanel';
import { EntriesTable } from '../components/EntriesTable';
import { HealthIndicator } from '../components/HealthIndicator';
import { HitMissChart } from '../components/HitMissChart';
import { KpiCards } from '../components/KpiCards';
import { PolicySelector } from '../components/PolicySelector';
import { PrefetchCard } from '../components/PrefetchCard';
import { UtilizationGauge } from '../components/UtilizationGauge';
import { WorkloadComparison } from '../components/WorkloadComparison';
import { Badge, POLICY_STYLE } from '../components/ui';
import { useCacheStream } from '../hooks/useCacheStream';
import type { ConnectionState } from '../hooks/useCacheStream';
import { api } from '../services/api';
import type { PolicyType } from '../types/cache';

const CONN: Record<ConnectionState, { label: string; cls: string }> = {
  connecting: { label: 'Connecting…', cls: 'bg-slate-500/10 text-slate-300 ring-slate-500/30' },
  live: { label: 'Live (SSE)', cls: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30' },
  polling: { label: 'Polling 1s', cls: 'bg-amber-500/10 text-amber-300 ring-amber-500/30' },
  offline: { label: 'Backend offline', cls: 'bg-rose-500/10 text-rose-300 ring-rose-500/30' },
};

export default function Dashboard() {
  const { snapshot, history, connection, refresh } = useCacheStream();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePolicy = async (p: PolicyType) => {
    setBusy(true);
    setError(null);
    try {
      await api.setPolicy(p);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const deleteKey = async (key: string) => {
    try {
      await api.remove(key);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const conn = CONN[connection];

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 p-2.5 shadow-lg shadow-violet-900/30">
            <Layers className="h-5 w-5 text-white" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-50">CacheLab Observability</h1>
            <p className="text-xs text-slate-500">Custom in-memory cache · live metrics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {snapshot && (
            <Badge className={POLICY_STYLE[snapshot.stats.activePolicy].badge}>
              engine: {snapshot.stats.activePolicy}
              {snapshot.stats.policy === 'ADAPTIVE' ? ' (adaptive)' : ''}
            </Badge>
          )}
          <Badge className={conn.cls}>
            {connection === 'offline' ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
            {conn.label}
          </Badge>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{error}</div>
      )}

      {!snapshot ? (
        <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-center text-slate-400">
          <p className="text-sm">
            {connection === 'offline' ? 'Cannot reach the backend on http://localhost:8080.' : 'Connecting to the cache backend…'}
          </p>
          {connection === 'offline' && <p className="text-xs text-slate-500">Start it with: mvn spring-boot:run</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <AnomalyBanner alerts={snapshot.stats.alerts} />

          <KpiCards stats={snapshot.stats} />

          <div className="grid gap-4 lg:grid-cols-3">
            <HitMissChart history={history} stats={snapshot.stats} />
            <PolicySelector stats={snapshot.stats} busy={busy} onChange={changePolicy} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HealthIndicator stats={snapshot.stats} />
            <UtilizationGauge stats={snapshot.stats} entries={snapshot.entries} />
            <PrefetchCard stats={snapshot.stats} />
            <ControlPanel onDone={refresh} />
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <EntriesTable entries={snapshot.entries} onDelete={deleteKey} />
            <ActivityFeed events={snapshot.events} />
          </div>

          <WorkloadComparison simulating={snapshot.stats.simulating} onLiveStarted={refresh} />
        </div>
      )}
    </div>
  );
}
