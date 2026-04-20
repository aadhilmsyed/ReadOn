// Dashboard orchestrator — the single facade that the views/ layer imports.
// All dashboard-related cross-cutting (read aggregation, single-story fetch,
// credit balance + recharge) flows through here. Internals (composition,
// clients) are not imported by views directly.

import { getAggregatedHistory } from './composition/getAggregatedHistory';
import { getStory }             from './clients/storyActionsClient';
import type { CreditBalance, RechargeResult } from './clients/creditsClient';
import { getCreditBalanceUnified, rechargeCreditsUnified } from './creditsUnified';

import type { FeatureKey } from '@shared/types/features';
import type { AggregatedHistory, FullStory } from './composition/types';

export async function fetchAggregatedHistory(limit?: number): Promise<AggregatedHistory> {
  return getAggregatedHistory(limit);
}

export async function fetchStory(feature: FeatureKey, storyId: string): Promise<FullStory> {
  return getStory(feature, storyId);
}

export async function fetchCreditBalance(userId: string): Promise<CreditBalance> {
  return getCreditBalanceUnified(userId);
}

export async function rechargeUserCredits(userId: string, dollars: number): Promise<RechargeResult> {
  return rechargeCreditsUnified(userId, dollars);
}
