import type { FeatureKey } from '@shared/types/features';
import { chargeCreditsUnified, getCreditBalanceUnified } from '@orchestrators/dashboard/creditsUnified';
import { DashboardServiceError } from '@orchestrators/dashboard/clients/baseHttpClient';
import {
  createReaderStoryRecord,
  patchReaderStoryAssets,
  patchReaderStoryRecord,
  type ReaderStoryFeatureStatus,
} from '@orchestrators/dashboard/clients/readerStoriesClient';
import {
  audiobookServiceBase,
  comprehensionServiceBase,
  imageGenerationServiceBase,
  phonicsServiceBase,
} from './serviceBaseUrls';

const FEATURE_ORDER: FeatureKey[] = ['phonics', 'comprehension', 'visualization', 'audiobook'];

const PATCH_ASSETS_TIMEOUT_MS = 120000;

function featureCreditCost(): number {
  const cost = Number(process.env.READON_FEATURE_CREDIT_COST ?? '5');
  if (!Number.isFinite(cost) || cost < 0) throw new Error('invalid_credit_cost');
  return cost;
}

export class InsufficientCreditsForStoryError extends Error {
  required: number;
  balance: number;
  constructor(required: number, balance: number) {
    super('insufficient_credits_for_story');
    this.required = required;
    this.balance = balance;
  }
}

export interface GenerateStoryInput {
  userId: string;
  title: string;
  sourceText: string;
}

export interface GenerateStoryResult {
  storyId: string;
  features: Record<FeatureKey, ReaderStoryFeatureStatus>;
}

async function preparePhonics(storyId: string, storyText: string): Promise<boolean> {
  const base = phonicsServiceBase();
  const timeoutMs = Number(process.env.READON_PHONICS_FETCH_TIMEOUT_MS ?? 120000);
  const res = await fetch(`${base}/process`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ storyId, storyText }),
    cache: 'no-store',
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 120000),
  });
  let body: unknown = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  const j = body as { success?: boolean; data?: unknown };
  return res.ok && j.success === true && Array.isArray(j.data);
}

async function prepareComprehension(
  storyId: string,
  userId: string,
  title: string,
  storyText: string,
): Promise<{ ok: boolean; resultId?: string }> {
  const base = comprehensionServiceBase();
  const timeoutMs = Number(process.env.READON_COMPREHENSION_FETCH_TIMEOUT_MS ?? 120000);
  const res = await fetch(`${base}/comprehension/questions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-readon-user-id': userId,
      'x-readon-story-id': storyId,
      'x-readon-story-title': title,
    },
    body: JSON.stringify({
      sourceText: storyText,
      questionCount: 5,
      difficulty: 'medium',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 120000),
  });
  let body: unknown = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  const j = body as { questions?: unknown; resultId?: string };
  const ok = res.ok && Array.isArray(j.questions) && j.questions.length > 0;
  const resultId = typeof j.resultId === 'string' && j.resultId.trim() ? j.resultId.trim() : undefined;
  return { ok, resultId };
}

async function prepareVisualization(storyId: string, userId: string, storyText: string): Promise<boolean> {
  const base = imageGenerationServiceBase();
  const timeoutMs = Number(process.env.READON_IMAGE_GEN_FETCH_TIMEOUT_MS ?? 180000);
  const res = await fetch(`${base}/images/storybook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ storyId, storyText, userId }),
    cache: 'no-store',
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 180000),
  });
  let body: unknown = {};
  try {
    body = await res.json();
  } catch {
    body = {};
  }
  const j = body as { success?: boolean };
  return res.ok && j.success === true;
}

async function prepareAudiobook(storyText: string): Promise<{ ok: boolean; audioBase64?: string }> {
  const base = audiobookServiceBase();
  const timeoutMs = Number(process.env.READON_AUDIOBOOK_FETCH_TIMEOUT_MS ?? 120000);
  const res = await fetch(`${base}/tts`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'audio/mpeg, application/json' },
    body: JSON.stringify({ text: storyText }),
    cache: 'no-store',
    signal: AbortSignal.timeout(Number.isFinite(timeoutMs) ? timeoutMs : 120000),
  });
  if (!res.ok) return { ok: false };
  const ct = res.headers.get('content-type') || '';
  if (!ct.includes('audio')) return { ok: false };
  const buf = Buffer.from(await res.arrayBuffer());
  return { ok: true, audioBase64: buf.toString('base64') };
}

function isReadyAtIndex(index: number, value: unknown): boolean {
  if (index === 0 || index === 2) {
    return value === true;
  }
  if (index === 1) {
    return !!(value && typeof value === 'object' && (value as { ok?: boolean }).ok === true);
  }
  if (index === 3) {
    return !!(value && typeof value === 'object' && (value as { ok?: boolean }).ok === true);
  }
  return false;
}

/**
 * Creates the reader story row, prepares all four features in parallel, persists per-feature status,
 * stores comprehension result id + audiobook audio for later retrieval, then charges 5 credits per successful feature only.
 */
export async function generateStoryForUser(input: GenerateStoryInput): Promise<GenerateStoryResult> {
  const costEach = featureCreditCost();
  const maxCharge = costEach * FEATURE_ORDER.length;
  const { balance } = await getCreditBalanceUnified(input.userId);
  if (balance < maxCharge) {
    throw new InsufficientCreditsForStoryError(maxCharge, balance);
  }

  const { story_id: storyId } = await createReaderStoryRecord({
    user_id: input.userId,
    title: input.title,
    source_text: input.sourceText.trim(),
  });

  const settled = await Promise.allSettled([
    preparePhonics(storyId, input.sourceText.trim()),
    prepareComprehension(storyId, input.userId, input.title, input.sourceText.trim()),
    prepareVisualization(storyId, input.userId, input.sourceText.trim()),
    prepareAudiobook(input.sourceText.trim()),
  ]);

  const features: Record<FeatureKey, ReaderStoryFeatureStatus> = {
    phonics: 'unavailable',
    comprehension: 'unavailable',
    visualization: 'unavailable',
    audiobook: 'unavailable',
  };

  FEATURE_ORDER.forEach((key, i) => {
    const r = settled[i];
    const value = r.status === 'fulfilled' ? r.value : null;
    features[key] = isReadyAtIndex(i, value) ? 'ready' : 'failed';
  });

  const compVal =
    settled[1].status === 'fulfilled' ? (settled[1].value as { ok?: boolean; resultId?: string }) : null;
  const audioVal =
    settled[3].status === 'fulfilled' ? (settled[3].value as { ok?: boolean; audioBase64?: string }) : null;

  if (compVal?.resultId || audioVal?.audioBase64) {
    await patchReaderStoryAssets(
      storyId,
      input.userId,
      {
        comprehension_result_id: compVal?.resultId ?? null,
        audiobook_audio_base64: audioVal?.audioBase64 ?? null,
      },
      PATCH_ASSETS_TIMEOUT_MS,
    );
  }

  await patchReaderStoryRecord(storyId, input.userId, {
    phonics_status: features.phonics,
    comprehension_status: features.comprehension,
    visualization_status: features.visualization,
    audiobook_status: features.audiobook,
  });

  for (const key of FEATURE_ORDER) {
    if (features[key] !== 'ready') continue;
    try {
      await chargeCreditsUnified(input.userId, costEach, `storygen:${key}:${storyId}`);
    } catch (e) {
      if (e instanceof DashboardServiceError && e.status === 402) {
        features[key] = 'failed';
      } else {
        throw e;
      }
    }
  }

  await patchReaderStoryRecord(storyId, input.userId, {
    phonics_status: features.phonics,
    comprehension_status: features.comprehension,
    visualization_status: features.visualization,
    audiobook_status: features.audiobook,
  });

  return { storyId, features };
}
