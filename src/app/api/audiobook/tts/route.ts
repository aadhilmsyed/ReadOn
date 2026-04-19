import '../loadAudiobookEnv';
import { NextRequest, NextResponse } from 'next/server';

import { requestFeatureProcessing } from '@orchestrators/features/featureActionOrchestrator';
import { insertTtsGenerationRow } from '@/lib/ttsGenerations';

export const runtime = 'nodejs';

function parseOptionalStoryId(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: NextRequest) {
  let storyId: number | null = null;

  try {
    const body = (await req.json()) as { text?: unknown; storyId?: unknown };
    const text = typeof body.text === 'string' ? body.text : '';
    storyId = parseOptionalStoryId(body.storyId);

    const { audioBuffer, mimeType } = await requestFeatureProcessing({
      feature: 'audiobook',
      sourceText: text,
    });

    await insertTtsGenerationRow({
      storyId,
      location: `inline-response:audio/mpeg:${audioBuffer.byteLength}b`,
      durationSeconds: null,
      status: 'completed',
      errorMessage: null,
    });

    return new NextResponse(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Read-aloud failed.';
    const status =
      message.includes('required') || message.includes('too long') || message.includes('max ')
        ? 400
        : 500;

    await insertTtsGenerationRow({
      storyId,
      location: 'inline-response:none',
      durationSeconds: null,
      status: 'failed',
      errorMessage: message,
    });

    return NextResponse.json({ error: message }, { status });
  }
}
