import type { ReactNode } from 'react';
import { Check, Flame, Plus, Snowflake, Sun, Timer, Trash2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { EventType, Heat, PolicyType } from '../types/cache';

export function Card({
  title, icon, action, className = '', children,
}: { title?: string; icon?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-black/20 backdrop-blur ${className}`}>
      {title && (
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">{icon}{title}</h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 w-max max-w-[16rem] -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-normal text-slate-100 opacity-0 shadow-lg ring-1 ring-slate-700 transition group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

export function Badge({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${className}`}>
      {children}
    </span>
  );
}

export const HIT_BADGE = 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30';
export const MISS_BADGE = 'bg-rose-500/10 text-rose-300 ring-rose-500/30';

export const POLICY_STYLE: Record<PolicyType, { badge: string; selected: string; hex: string; label: string; desc: string }> = {
  LRU: {
    badge: 'bg-blue-500/10 text-blue-300 ring-blue-500/30',
    selected: 'border-blue-500/60 bg-blue-500/10',
    hex: '#60a5fa',
    label: 'LRU',
    desc: 'Evicts the entry that has not been used for the longest time.',
  },
  LFU: {
    badge: 'bg-violet-500/10 text-violet-300 ring-violet-500/30',
    selected: 'border-violet-500/60 bg-violet-500/10',
    hex: '#a78bfa',
    label: 'LFU',
    desc: 'Evicts the entry that has been accessed the fewest times.',
  },
  ADAPTIVE: {
    badge: 'bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-500/30',
    selected: 'border-fuchsia-500/60 bg-fuchsia-500/10',
    hex: '#e879f9',
    label: 'Adaptive',
    desc: 'Switches between LRU and LFU based on measured access skew.',
  },
};

export const HEAT_STYLE: Record<Heat, { badge: string; hex: string; Icon: LucideIcon }> = {
  HOT: { badge: 'bg-orange-500/10 text-orange-300 ring-orange-500/30', hex: '#fb923c', Icon: Flame },
  WARM: { badge: 'bg-amber-500/10 text-amber-300 ring-amber-500/30', hex: '#fbbf24', Icon: Sun },
  COLD: { badge: 'bg-cyan-500/10 text-cyan-300 ring-cyan-500/30', hex: '#22d3ee', Icon: Snowflake },
};

export const EVENT_STYLE: Record<EventType, { badge: string; dot: string; Icon: LucideIcon }> = {
  HIT: { badge: HIT_BADGE, dot: 'bg-emerald-500/15 text-emerald-400', Icon: Check },
  MISS: { badge: MISS_BADGE, dot: 'bg-rose-500/15 text-rose-400', Icon: X },
  PUT: { badge: 'bg-indigo-500/10 text-indigo-300 ring-indigo-500/30', dot: 'bg-indigo-500/15 text-indigo-400', Icon: Plus },
  EVICTION: { badge: 'bg-amber-500/10 text-amber-300 ring-amber-500/30', dot: 'bg-amber-500/15 text-amber-400', Icon: Trash2 },
  EXPIRATION: { badge: 'bg-slate-500/10 text-slate-300 ring-slate-500/30', dot: 'bg-slate-500/20 text-slate-300', Icon: Timer },
};

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 2) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
}
