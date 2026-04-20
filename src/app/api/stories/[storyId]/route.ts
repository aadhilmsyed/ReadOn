import { NextResponse } from 'next/server';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';
import { getReaderStoryRecord } from '@orchestrators/dashboard/clients/readerStoriesClient';
import type { FeatureKey } from '@shared/types/features';
import type { ReaderStoryFeatureStatus } from '@orchestrators/dashboard/clients/readerStoriesClient';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { storyId: string } }) {
  const session = await getSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const row = await getReaderStoryRecord(params.storyId, session.email);
  if (!row) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const features: Record<FeatureKey, ReaderStoryFeatureStatus> = {
    phonics: row.phonics_status,
    comprehension: row.comprehension_status,
    visualization: row.visualization_status,
    audiobook: row.audiobook_status,
  };

  return NextResponse.json({
    storyId: row.story_id,
    title: row.title,
    sourceText: row.source_text,
    features,
    comprehensionResultId: row.comprehension_result_id ?? null,
    createdAt: row.created_at,
  });
}
