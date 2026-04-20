import { NextResponse } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const user = await getSessionUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
  return NextResponse.json({ authenticated: true, user });
}
