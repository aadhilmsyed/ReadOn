import { NextResponse } from 'next/server';
import { fetchStory } from '@orchestrators/dashboard/dashboardOrchestrator';
import { getReaderStoryRecord } from '@orchestrators/dashboard/clients/readerStoriesClient';
import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';
import type { FeatureKey } from '@shared/types/features';

export const dynamic = 'force-dynamic';

const VALID_FEATURES: ReadonlyArray<FeatureKey> = ['phonics', 'comprehension', 'visualization', 'audiobook'];

export async function GET(request: Request, { params }: { params: { feature: string; storyId: string } }) {
  const session = await getSessionUserFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { feature, storyId } = params;
  if (!VALID_FEATURES.includes(feature as FeatureKey)) {
    return NextResponse.json({ error: 'invalid_feature' }, { status: 400 });
  }

  const owned = await getReaderStoryRecord(storyId, session.email);
  if (!owned) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  try {
    const story = await fetchStory(feature as FeatureKey, storyId);
    return NextResponse.json(story);
  } catch (err) {
    return NextResponse.json({ error: 'fetch_failed', message: (err as Error).message }, { status: 502 });
  }
}
