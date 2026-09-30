import type {
  CacheEntryDto, CacheStats, CompareResult, ConcurrentRequest, ConcurrentResult, GetResponse, PolicyType,
  RemoveResponse, SimulateResponse, Snapshot, WorkloadRequest,
} from '../types/cache';

const BASE = '/api/cache';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch { /* no body */ }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const enc = encodeURIComponent;

export const api = {
  streamUrl: `${BASE}/stream`,

  get: (key: string) => request<GetResponse>(`/${enc(key)}`),
  put: (key: string, value: string, ttlSeconds?: number) =>
    request<void>(`/${enc(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value, ttlSeconds: ttlSeconds ?? null }),
    }),
  remove: (key: string) => request<RemoveResponse>(`/${enc(key)}`, { method: 'DELETE' }),

  entries: () => request<CacheEntryDto[]>('/entries'),
  stats: () => request<CacheStats>('/stats'),
  snapshot: () => request<Snapshot>('/snapshot'),

  setPolicy: (policy: PolicyType) =>
    request<CacheStats>('/policy', { method: 'PUT', body: JSON.stringify({ policy }) }),
  clear: (resetStats = false) =>
    request<CacheStats>(`/clear?resetStats=${resetStats}`, { method: 'POST' }),

  compare: (req: WorkloadRequest) =>
    request<CompareResult>('/compare', { method: 'POST', body: JSON.stringify(req) }),
  simulate: (req: WorkloadRequest) =>
    request<SimulateResponse>('/simulate', { method: 'POST', body: JSON.stringify(req) }),
  concurrent: (req: ConcurrentRequest) =>
    request<ConcurrentResult>('/concurrent', { method: 'POST', body: JSON.stringify(req) }),
};
