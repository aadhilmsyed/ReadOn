import { NextResponse } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';
import { getAudiobookAudioFromReaderStory, getReaderStoryRecord } from '@orchestrators/dashboard/clients/readerStoriesClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Returns prepared read-aloud audio for a story (base64), after ownership checks.
 */
export async function GET(_request: Request, { params }: { params: { storyId: string } }) {
  const session = await getSessionUserFromRequest(_request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const row = await getReaderStoryRecord(params.storyId, session.email);
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (row.audiobook_status !== 'ready') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const audio = await getAudiobookAudioFromReaderStory(params.storyId, session.email);
  if (!audio?.audioBase64) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    mimeType: audio.mimeType || 'audio/mpeg',
    audioBase64: audio.audioBase64,
  });
}
