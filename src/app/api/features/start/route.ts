import { NextResponse } from 'next/server';
import {
  startFeature,
  FeatureValidationError,
  InsufficientCreditsError,
} from '@orchestrators/features/featureActionOrchestrator';
import type { FeatureKey } from '@shared/types/features';

export const dynamic = 'force-dynamic';

interface Body { feature?: FeatureKey; title?: string; sourceText?: string; userId?: string }

export async function POST(request: Request) {
  let body: Body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  try {
    const result = await startFeature({
      feature:    body.feature as FeatureKey,
      title:      body.title    ?? '',
      sourceText: body.sourceText ?? '',
      userId:     body.userId   ?? '',
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof FeatureValidationError) {
      return NextResponse.json({ error: 'validation_failed', field: err.field, reason: err.reason }, { status: 400 });
    }
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json({ error: 'insufficient_credits', cost: err.cost }, { status: 402 });
    }
    return NextResponse.json({ error: 'feature_start_failed', message: (err as Error).message }, { status: 502 });
  }
}
