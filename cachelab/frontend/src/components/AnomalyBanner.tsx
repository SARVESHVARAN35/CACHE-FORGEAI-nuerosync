import { useState, useEffect } from 'react';
import { AlertTriangle, X, Lightbulb } from 'lucide-react';
import type { CacheAlert } from '../types/cache';

const STYLE: Record<string, { border: string; bg: string; icon: string; dot: string }> = {
  MISS_SPIKE: {
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/8',
    icon: 'text-rose-400',
    dot: 'bg-rose-500',
  },
  HIGH_UTILIZATION: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/8',
    icon: 'text-amber-400',
    dot: 'bg-amber-500',
  },
};

const DEFAULT_STYLE = {
  border: 'border-slate-500/40',
  bg: 'bg-slate-500/8',
  icon: 'text-slate-400',
  dot: 'bg-slate-400',
};

interface Props {
  alerts: CacheAlert[];
}

export function AnomalyBanner({ alerts }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [prevKeys, setPrevKeys] = useState<string[]>([]);

  // Auto-undismiss when a new alert type arrives that wasn't there before
  useEffect(() => {
    const currentKeys = alerts.map((a) => a.type);
    const newKeys = currentKeys.filter((k) => !prevKeys.includes(k));
    if (newKeys.length > 0) {
      setDismissed((d) => {
        const next = new Set(d);
        newKeys.forEach((k) => next.delete(k));
        return next;
      });
    }
    setPrevKeys(currentKeys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.map((a) => a.type).join(',')]);

  const visible = alerts.filter((a) => !dismissed.has(a.type));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => {
        const s = STYLE[alert.type] ?? DEFAULT_STYLE;
        return (
          <div
            key={alert.type}
            className={`flex items-start gap-3 rounded-xl border ${s.border} ${s.bg} px-4 py-3 backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300`}
          >
            {/* Pulsing dot */}
            <span className="relative mt-0.5 flex h-3 w-3 shrink-0">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${s.dot} opacity-60`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${s.dot}`} />
            </span>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 shrink-0 ${s.icon}`} />
                <span className={`text-xs font-semibold ${s.icon}`}>CACHE ALERT</span>
              </div>
              <p className="mt-1 text-xs text-slate-200 font-medium">{alert.message}</p>
              {alert.suggestion && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-slate-400">
                  <Lightbulb className="h-3 w-3 shrink-0 mt-0.5 text-amber-400" />
                  {alert.suggestion}
                </p>
              )}
            </div>

            <button
              onClick={() => setDismissed((d) => new Set([...d, alert.type]))}
              className="shrink-0 rounded p-0.5 text-slate-500 hover:text-slate-300 transition"
              aria-label="Dismiss alert"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
