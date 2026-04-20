// Reader stories are persisted only in dashboard-service Postgres via `models/readerStoryModel.js` (HTTP API below).
import { DashboardServiceError, httpGet, httpPatch, httpPost } from './baseHttpClient';

export type ReaderStoryFeatureStatus = 'pending' | 'ready' | 'failed' | 'unavailable';

export interface ReaderStoryRow {
  story_id: string;
  user_id: string;
  title: string;
  source_text: string;
  phonics_status: ReaderStoryFeatureStatus;
  comprehension_status: ReaderStoryFeatureStatus;
  visualization_status: ReaderStoryFeatureStatus;
  audiobook_status: ReaderStoryFeatureStatus;
  /** Set after Generate Story when comprehension succeeded; used to load questions without regenerating. */
  comprehension_result_id?: string | null;
  created_at: string;
}

export interface ReaderStoryListItem {
  story_id: string;
  title: string;
  source_text: string;
  phonics_status: ReaderStoryFeatureStatus;
  comprehension_status: ReaderStoryFeatureStatus;
  visualization_status: ReaderStoryFeatureStatus;
  audiobook_status: ReaderStoryFeatureStatus;
  created_at: string;
}

export async function createReaderStoryRecord(input: {
  user_id: string;
  title: string;
  source_text: string;
}): Promise<{ story_id: string }> {
  return httpPost<{ story_id: string }>('/reader-stories', {
    user_id: input.user_id,
    title: input.title,
    source_text: input.source_text,
  });
}

export async function getReaderStoryRecord(storyId: string, userId: string): Promise<ReaderStoryRow | null> {
  const q = `/reader-stories/${encodeURIComponent(storyId)}?user_id=${encodeURIComponent(userId)}`;
  try {
    return await httpGet<ReaderStoryRow>(q);
  } catch (e) {
    if (e instanceof DashboardServiceError && e.status === 404) {
      return null;
    }
    throw e;
  }
}

export async function listReaderStoryRecords(userId: string, limit: number): Promise<ReaderStoryListItem[]> {
  const q = `/reader-stories?user_id=${encodeURIComponent(userId)}&limit=${encodeURIComponent(String(limit))}`;
  const body = await httpGet<{ stories: ReaderStoryListItem[] }>(q);
  return body.stories ?? [];
}

export async function patchReaderStoryRecord(
  storyId: string,
  userId: string,
  patch: Partial<Record<'phonics_status' | 'comprehension_status' | 'visualization_status' | 'audiobook_status', ReaderStoryFeatureStatus>>,
): Promise<void> {
  await httpPatch<{ ok: boolean }>(`/reader-stories/${encodeURIComponent(storyId)}`, {
    user_id: userId,
    ...patch,
  });
}

export async function patchReaderStoryAssets(
  storyId: string,
  userId: string,
  assets: { comprehension_result_id?: string | null; audiobook_audio_base64?: string | null },
  timeoutMs?: number,
): Promise<void> {
  await httpPatch<{ ok: boolean }>(
    `/reader-stories/${encodeURIComponent(storyId)}/assets`,
    {
      user_id: userId,
      ...assets,
    },
    timeoutMs,
  );
}

export async function getAudiobookAudioFromReaderStory(
  storyId: string,
  userId: string,
): Promise<{ mimeType: string; audioBase64: string } | null> {
  const q = `/reader-stories/${encodeURIComponent(storyId)}/audiobook?user_id=${encodeURIComponent(userId)}`;
  try {
    return await httpGet<{ mimeType: string; audioBase64: string }>(q);
  } catch (e) {
    if (e instanceof DashboardServiceError && e.status === 404) {
      return null;
    }
    throw e;
  }
}
