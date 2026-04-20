/**
 * BFF: forwards to the phonics microservice (`GET /story/:storyId`).
 */
import { NextResponse } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';
import { getReaderStoryRecord } from '@orchestrators/dashboard/clients/readerStoriesClient';
import { phonicsDownError, phonicsServiceBaseUrl } from '@/lib/microserviceHttp';

export async function GET(
  request: Request,
  context: { params: { storyId: string } },
) {
  const session = await getSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { storyId } = context.params;
  const owned = await getReaderStoryRecord(storyId, session.email);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const base = phonicsServiceBaseUrl();
  const url = `${base}/story/${encodeURIComponent(storyId)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(Number(process.env.READON_PHONICS_FETCH_TIMEOUT_MS ?? 120000)),
    });

    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    return NextResponse.json(parsed as object, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    return NextResponse.json(
      {
        success: false,
        error: phonicsDownError(msg),
      },
      { status: 502 },
    );
  }
}
