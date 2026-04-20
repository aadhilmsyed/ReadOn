import { notFound, redirect } from 'next/navigation';

import { getReaderStoryRecord } from '@orchestrators/dashboard/clients/readerStoriesClient';
import { getSessionUserFromCookies } from '@/lib/auth/getSessionUser';
import { FeaturesStoryHubPage } from '@views/features/FeaturesStoryHubPage';
import type { FeatureKey } from '@shared/types/features';
import type { ReaderStoryFeatureStatus } from '@orchestrators/dashboard/clients/readerStoriesClient';

export const dynamic = 'force-dynamic';

export default async function FeaturesStoryPage({ params }: { params: { storyId: string } }) {
  const session = await getSessionUserFromCookies();
  if (!session) {
    redirect(`/auth?next=${encodeURIComponent(`/features/${params.storyId}`)}`);
  }

  const row = await getReaderStoryRecord(params.storyId, session.email);
  if (!row) {
    notFound();
  }

  const features: Record<FeatureKey, ReaderStoryFeatureStatus> = {
    phonics: row.phonics_status,
    comprehension: row.comprehension_status,
    visualization: row.visualization_status,
    audiobook: row.audiobook_status,
  };

  return (
    <FeaturesStoryHubPage
      storyId={row.story_id}
      title={row.title}
      sourceText={row.source_text}
      features={features}
    />
  );
}
