// Feature-action orchestrator — the single entry point for "user clicked one
// of the four feature buttons on the home page". Cross-cutting concerns
// (validation, credit deduction) live here exactly once instead of repeated
// at each of the four call sites.

import type { FeatureKey } from '@shared/types/features';
import { createStory }        from '@orchestrators/dashboard/clients/storyActionsClient';
import { chargeCredits }      from '@orchestrators/dashboard/clients/creditsClient';
import { DashboardServiceError } from '@orchestrators/dashboard/clients/baseHttpClient';

export interface StartFeatureRequest {
  feature: FeatureKey;
  title: string;
  sourceText: string;
  userId: string;
}

export interface StartFeatureResult {
  storyId: string;
  feature: FeatureKey;
  /** Pre-built path to navigate to after a successful start. */
  redirectTo: string;
  /** Balance after the feature charge so the UI can update without a refetch. */
  remainingCredits: number;
}

export class FeatureValidationError extends Error {
  field: 'title' | 'sourceText' | 'feature' | 'userId';
  reason: 'empty' | 'too_long' | 'invalid';
  constructor(field: FeatureValidationError['field'], reason: FeatureValidationError['reason']) {
    super(`${field}_${reason}`);
    this.field  = field;
    this.reason = reason;
  }
}

export class InsufficientCreditsError extends Error {
  cost: number;
  constructor(cost: number) {
    super('insufficient_credits');
    this.cost = cost;
  }
}

const TITLE_MAX = 100;
const VALID_FEATURES: ReadonlyArray<FeatureKey> = ['phonics', 'comprehension', 'visualization', 'audiobook'];

function validate(req: StartFeatureRequest): void {
  if (!VALID_FEATURES.includes(req.feature)) throw new FeatureValidationError('feature', 'invalid');

  if (typeof req.userId !== 'string' || req.userId.trim().length === 0) {
    throw new FeatureValidationError('userId', 'empty');
  }

  const title = (req.title ?? '').trim();
  if (title.length === 0)       throw new FeatureValidationError('title', 'empty');
  if (title.length > TITLE_MAX) throw new FeatureValidationError('title', 'too_long');

  const text = (req.sourceText ?? '').trim();
  if (text.length === 0)        throw new FeatureValidationError('sourceText', 'empty');
}

function featureCreditCost(): number {
  const cost = Number(process.env.READON_FEATURE_CREDIT_COST ?? '10');
  if (!Number.isFinite(cost) || cost < 0) throw new Error('invalid_credit_cost');
  return cost;
}

async function deductCredits(userId: string, feature: FeatureKey): Promise<number> {
  const cost = featureCreditCost();
  try {
    const result = await chargeCredits(userId, cost, `feature:${feature}`);
    return result.balance;
  } catch (err) {
    if (err instanceof DashboardServiceError && err.status === 402) {
      throw new InsufficientCreditsError(cost);
    }
    throw err;
  }
}

export async function startFeature(req: StartFeatureRequest): Promise<StartFeatureResult> {
  validate(req);
  const remainingCredits = await deductCredits(req.userId, req.feature);

  const story = await createStory(req.feature, {
    title: req.title.trim(),
    source_text: req.sourceText.trim(),
  });

  return {
    storyId:    story.story_id,
    feature:    req.feature,
    redirectTo: `/${req.feature}?storyId=${encodeURIComponent(story.story_id)}`,
    remainingCredits,
  };
}
