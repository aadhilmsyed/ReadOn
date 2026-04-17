import { NextRequest, NextResponse } from 'next/server';

import { requestFeatureProcessing } from '@orchestrators/features/featureActionOrchestrator';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: unknown };
    const text = typeof body.text === 'string' ? body.text : '';

    const { audioBuffer, mimeType } = await requestFeatureProcessing({
      feature: 'audiobook',
      sourceText: text,
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
    return NextResponse.json({ error: message }, { status });
  }
}
