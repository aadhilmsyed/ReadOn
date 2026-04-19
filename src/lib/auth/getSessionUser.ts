import { AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import { verifySessionToken } from '@/lib/auth/jwt';

export interface SessionUser {
  email: string;
  name: string;
}

function readCookieFromHeader(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    if (k !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}

export async function getSessionUserFromRequest(request: Request): Promise<SessionUser | null> {
  const token = readCookieFromHeader(request.headers.get('cookie'), AUTH_COOKIE_NAME);
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.sub) return null;
  return { email: payload.sub.toLowerCase(), name: payload.name || payload.sub };
}
