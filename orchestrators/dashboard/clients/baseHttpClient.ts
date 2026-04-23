// Shared HTTP helper for the dashboard composition layer. Centralizes
// timeouts, error normalization, and base-URL resolution.
//
// By default requests target the dashboard-service (credits, reader-stories,
// story-actions). The per-feature history clients pass their own
// `baseUrl` / `serviceLabel` so the composition layer can fan out to four
// independent feature microservices — this is what makes the API Composition
// pattern a real cross-service fan-out, not a colocated multi-route call.

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

export interface RequestOptions {
  /** Target base URL — defaults to dashboard-service. Pass per-feature URL to fan out. */
  baseUrl?: string;
  /** Human-readable service label for error messages. Defaults to "Dashboard service". */
  serviceLabel?: string;
  /** Local start command shown in error messages. Defaults to dashboard-service. */
  startCommand?: string;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body: unknown | undefined,
  timeoutMs: number,
  options?: RequestOptions,
): Promise<T> {
  const base = (options?.baseUrl ?? dashboardServiceBaseUrl()).replace(/\/$/, '');
  const label = options?.serviceLabel ?? 'Dashboard service';
  const startCmd = options?.startCommand ?? START_COMMANDS.dashboard;

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
    if (!res.ok) throw new DashboardServiceError(`${label} ${method} ${path} failed (${res.status})`, res.status, parsed);
    return parsed as T;
  } catch (e) {
    if (e instanceof DashboardServiceError) throw e;
    const cause = e instanceof Error ? e.message : String(e);
    throw new Error(serviceDownMessage(label, base, startCmd, cause));
  } finally {
    clearTimeout(timer);
  }
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return s; }
}

export const httpGet = <T>(path: string, timeoutMs?: number, options?: RequestOptions): Promise<T> =>
  request<T>('GET', path, undefined, timeoutMs ?? dashboardTimeoutMs(), options);

export const httpPost = <T>(path: string, body: unknown, timeoutMs?: number, options?: RequestOptions): Promise<T> =>
  request<T>('POST', path, body, timeoutMs ?? dashboardTimeoutMs(), options);

export const httpPatch = <T>(path: string, body: unknown, timeoutMs?: number, options?: RequestOptions): Promise<T> =>
  request<T>('PATCH', path, body, timeoutMs ?? dashboardTimeoutMs(), options);
