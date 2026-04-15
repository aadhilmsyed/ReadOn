// Shared HTTP helper used by the per-feature history clients and the
// story-actions client. Centralizes timeouts, error normalization, and the
// dashboard-service base URL so the composition layer can stay declarative.

const DEFAULT_TIMEOUT_MS = 4000;

export class DashboardServiceError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function dashboardServiceBaseUrl(): string {
  const url = process.env.READON_DASHBOARD_SERVICE_URL;
  if (!url) throw new Error('READON_DASHBOARD_SERVICE_URL is not configured');
  return url.replace(/\/$/, '');
}

async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${dashboardServiceBaseUrl()}${path}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ac.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    const parsed = text ? safeParse(text) : null;
    if (!res.ok) throw new DashboardServiceError(`dashboard-service ${method} ${path} failed (${res.status})`, res.status, parsed);
    return parsed as T;
  } finally {
    clearTimeout(timer);
  }
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

export const httpGet  = <T>(path: string, timeoutMs?: number): Promise<T> => request<T>('GET',  path, undefined, timeoutMs);
export const httpPost = <T>(path: string, body: unknown, timeoutMs?: number): Promise<T> => request<T>('POST', path, body,      timeoutMs);
