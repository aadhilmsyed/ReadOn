import { NextResponse } from 'next/server';

import { serviceDownMessage, LOCAL_SERVICE_URLS, START_COMMANDS } from '@shared/http/serviceUnavailable';

export const runtime = 'nodejs';

function imageServiceBase(): string {
  const a = process.env.READON_IMAGE_GENERATION_SERVICE_URL?.trim();
  const b = process.env.READON_VISUALIZATION_SERVICE_URL?.trim();
  const raw = a || b;
  if (!raw || raw === 'REPLACE_ME' || raw === 'NULL') {
    return LOCAL_SERVICE_URLS.imageGeneration.replace(/\/$/, '');
  }
  return raw.replace(/\/$/, '');
}

export async function POST(request: Request) {
  const base = imageServiceBase();
  const url = `${base}/images/generate`;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: { message: 'Invalid JSON' } }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(Number(process.env.READON_IMAGE_GEN_FETCH_TIMEOUT_MS ?? 120000)),
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
        error: {
          message: serviceDownMessage(
            'Image generation service',
            base,
            START_COMMANDS.imageGeneration,
            msg,
          ),
        },
      },
      { status: 502 },
    );
  }
}
