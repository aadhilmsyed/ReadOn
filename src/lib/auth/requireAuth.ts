import { NextResponse } from 'next/server';

import { getSessionUserFromRequest, type SessionUser } from '@/lib/auth/getSessionUser';

export async function requireSessionUser(request: Request): Promise<SessionUser | NextResponse> {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized', message: 'Sign in required.' }, { status: 401 });
  }
  return user;
}
