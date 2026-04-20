import { NextResponse } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';
import { listReaderStoryRecords } from '@orchestrators/dashboard/clients/readerStoriesClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;

  try {
    const stories = await listReaderStoryRecords(session.email, limit);
    return NextResponse.json({ stories });
  } catch (err) {
    return NextResponse.json({ error: 'list_failed', message: (err as Error).message }, { status: 502 });
  }
}
