import { Radio } from 'lucide-react';
import type { ActivityEvent } from '../types/cache';
import { Badge, Card, EVENT_STYLE } from './ui';

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card title="Recent activity" icon={<Radio className="h-4 w-4 text-slate-400" />}>
      <div className="h-[420px] overflow-y-auto pr-1">
        {events.length === 0 && (
          <p className="py-10 text-center text-xs text-slate-500">No activity yet.</p>
        )}
        <ul className="space-y-1.5">
          {events.map((e) => {
            const s = EVENT_STYLE[e.type];
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-800/40">
                <span className={`rounded-full p-1.5 ${s.dot}`}><s.Icon className="h-3 w-3" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={s.badge}>{e.type}</Badge>
                    <span className="truncate font-mono text-xs text-slate-200">{e.key}</span>
                  </div>
                  {e.detail && <div className="mt-0.5 truncate text-[11px] text-slate-500">{e.detail}</div>}
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
