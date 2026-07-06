import { NextResponse } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';
import { getReaderStoryRecord, patchReaderStoryRecord } from '@orchestrators/dashboard/clients/readerStoriesClient';
import { imageGenerationServiceBase } from '@orchestrators/story/serviceBaseUrls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_request: Request, { params }: { params: { storyId: string } }) {
  const session = await getSessionUserFromRequest(_request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const row = await getReaderStoryRecord(params.storyId, session.email);
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const base = imageGenerationServiceBase();
  const url = `${base}/images/story/${encodeURIComponent(params.storyId)}`;
  const timeoutMs = Number(process.env.READON_IMAGE_GEN_FETCH_TIMEOUT_MS ?? 120000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 120000),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }

    const payload = parsed as { scenes?: unknown[] };
    const hasScenes = Array.isArray(payload.scenes) && payload.scenes.length > 0;

    if (!hasScenes && row.visualization_status !== 'ready') {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    // Images exist but dashboard status is stale (e.g. client timeout during storygen).
    if (hasScenes && row.visualization_status !== 'ready') {
      try {
        await patchReaderStoryRecord(params.storyId, session.email, { visualization_status: 'ready' });
      } catch {
        // Non-fatal: still return scenes to the client.
      }
    }

    return NextResponse.json(parsed as object, { status: res.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch_failed';
    return NextResponse.json({ error: 'upstream_failed', message: msg }, { status: 502 });
  }
}
