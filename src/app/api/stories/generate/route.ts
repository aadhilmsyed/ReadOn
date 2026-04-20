import { NextResponse } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';
import { STORY_TITLE_MAX_LENGTH } from '@/lib/story/deriveStoryTitle';
import {
  generateStoryForUser,
  InsufficientCreditsForStoryError,
} from '@orchestrators/story/generateStoryOrchestrator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_TEXT = 3500;

interface Body {
  sourceText?: unknown;
  title?: unknown;
}

export async function POST(request: Request) {
  const session = await getSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const sourceText = typeof body.sourceText === 'string' ? body.sourceText.trim() : '';
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title) {
    return NextResponse.json({ error: 'validation', message: 'Story title is required.' }, { status: 400 });
  }
  if (title.length > STORY_TITLE_MAX_LENGTH) {
    return NextResponse.json(
      { error: 'validation', message: `Story title must be at most ${STORY_TITLE_MAX_LENGTH} characters.` },
      { status: 400 },
    );
  }
  if (!sourceText) {
    return NextResponse.json({ error: 'validation', message: 'Story text is required.' }, { status: 400 });
  }
  if (sourceText.length > MAX_TEXT) {
    return NextResponse.json({ error: 'validation', message: `Story text must be at most ${MAX_TEXT} characters.` }, { status: 400 });
  }

  try {
    const result = await generateStoryForUser({
      userId: session.email,
      title,
      sourceText,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof InsufficientCreditsForStoryError) {
      return NextResponse.json(
        {
          error: 'insufficient_credits',
          required: err.required,
          balance: err.balance,
        },
        { status: 402 },
      );
    }
    return NextResponse.json({ error: 'generate_failed', message: (err as Error).message }, { status: 502 });
  }
}
