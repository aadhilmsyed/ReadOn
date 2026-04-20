// Shared HTTP helper used by the per-feature history clients and the
// story-actions client. Centralizes timeouts, error normalization, and the
// dashboard-service base URL so the composition layer can stay declarative.

import { serviceDownMessage, LOCAL_SERVICE_URLS, START_COMMANDS } from '@shared/http/serviceUnavailable';

function dashboardTimeoutMs(): number {
  const raw = Number(process.env.READON_DASHBOARD_HTTP_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw >= 1000 && raw <= 120000) return raw;
  return 15000;
}

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
  const url = process.env.READON_DASHBOARD_SERVICE_URL?.trim();
  if (!url || url === 'REPLACE_ME' || url === 'NULL') {
    return LOCAL_SERVICE_URLS.dashboard.replace(/\/$/, '');
  }
  return url.replace(/\/$/, '');
}

async function request<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown, timeoutMs = dashboardTimeoutMs()): Promise<T> {
  const base = dashboardServiceBaseUrl();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: ac.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    const parsed = text ? safeParse(text) : null;
    if (!res.ok) throw new DashboardServiceError(`dashboard-service ${method} ${path} failed (${res.status})`, res.status, parsed);
    return parsed as T;
  } catch (e) {
    if (e instanceof DashboardServiceError) throw e;
    const cause = e instanceof Error ? e.message : String(e);
    throw new Error(serviceDownMessage('Dashboard service', base, START_COMMANDS.dashboard, cause));
  } finally {
    clearTimeout(timer);
  }
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

export const httpGet  = <T>(path: string, timeoutMs?: number): Promise<T> => request<T>('GET',  path, undefined, timeoutMs);
export const httpPost = <T>(path: string, body: unknown, timeoutMs?: number): Promise<T> => request<T>('POST', path, body,      timeoutMs);
export const httpPatch = <T>(path: string, body: unknown, timeoutMs?: number): Promise<T> => request<T>('PATCH', path, body,    timeoutMs);
