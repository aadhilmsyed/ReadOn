/**
 * BFF: forwards to the phonics microservice over HTTP (`POST /process`).
 */
import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

import { phonicsDownError, phonicsServiceBaseUrl } from '@/lib/microserviceHttp';

type IncomingBody = {
  storyText?: unknown;
  storyId?: unknown;
};

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', detail: 'Expected JSON object' },
      { status: 400 },
    );
  }

  const raw = body as IncomingBody;
  const storyText =
    typeof raw.storyText === 'string' ? raw.storyText.trim() : '';
  if (!storyText) {
    return NextResponse.json(
      { success: false, error: 'Invalid request body', detail: 'storyText is required' },
      { status: 400 },
    );
  }

  const existingId =
    typeof raw.storyId === 'string' && raw.storyId.trim() ? raw.storyId.trim() : '';
  const storyId = existingId || randomUUID();

  const base = phonicsServiceBaseUrl();
  const url = `${base}/process`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ storyId, storyText }),
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
