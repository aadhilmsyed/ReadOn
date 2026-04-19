/**
 * Application route: accepts story text, generates a unique story ID server-side,
 * then forwards to the phonics microservice controller.
 * Clients may omit `storyId`; optional `storyId` is preserved for tests / legacy callers.
 */
import '../loadPhonicsEnv';
import { randomUUID } from 'crypto';

import { NextResponse } from 'next/server';

import { handlePostProcessPhonics } from '@phonics/routes/handlers';

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

  const result = await handlePostProcessPhonics({ storyId, storyText });
  return NextResponse.json(result.body, { status: result.status });
}
