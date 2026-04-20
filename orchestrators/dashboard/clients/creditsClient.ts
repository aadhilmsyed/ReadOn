// Credits client — talks to dashboard-service /credits/* endpoints. Used by
// the dashboard orchestrator (read + recharge) and by the
// feature-action orchestrator (charge, write path).

import { httpGet, httpPost } from './baseHttpClient';

export interface CreditBalance {
  user_id: string;
  balance: number;
}

export interface RechargeResult extends CreditBalance {
  dollars: number;
  credits: number;
}

export interface ChargeResult extends CreditBalance {
  charged: number;
  reason: string;
}

export async function getCreditBalance(userId: string): Promise<CreditBalance> {
  return httpGet<CreditBalance>(`/credits/${encodeURIComponent(userId)}`);
}

export async function rechargeCredits(userId: string, dollars: number): Promise<RechargeResult> {
  return httpPost<RechargeResult>(`/credits/${encodeURIComponent(userId)}/recharge`, { dollars });
}

export async function chargeCredits(userId: string, amount: number, reason: string): Promise<ChargeResult> {
  return httpPost<ChargeResult>(`/credits/${encodeURIComponent(userId)}/charge`, { amount, reason });
}
