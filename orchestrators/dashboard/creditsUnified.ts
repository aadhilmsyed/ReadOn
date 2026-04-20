import {
  chargeCreditsDirect,
  getBalanceDirect,
  rechargeCreditsDirect,
} from '@/lib/credits/directCredits';
import { chargeCredits, getCreditBalance, rechargeCredits } from '@orchestrators/dashboard/clients/creditsClient';
import { DashboardServiceError } from '@orchestrators/dashboard/clients/baseHttpClient';

function useHttpDashboard(): boolean {
  return Boolean(process.env.READON_DASHBOARD_SERVICE_URL?.trim());
}

export async function chargeCreditsUnified(
  userId: string,
  amount: number,
  reason: string,
): Promise<{ user_id: string; balance: number; charged: number; reason: string }> {
  if (useHttpDashboard()) {
    return chargeCredits(userId, amount, reason);
  }
  return chargeCreditsDirect(userId, amount, reason);
}

export async function getCreditBalanceUnified(userId: string): Promise<{ user_id: string; balance: number }> {
  if (useHttpDashboard()) {
    try {
      return await getCreditBalance(userId);
    } catch (err) {
      // Timeouts, connection errors, and 5xx from dashboard-service fall back to the same Postgres ledger
      // the service uses, so credits stay usable when the HTTP hop is flaky.
      if (err instanceof DashboardServiceError && err.status >= 500) {
        return getBalanceDirect(userId);
      }
      if (!(err instanceof DashboardServiceError)) {
        return getBalanceDirect(userId);
      }
      throw err;
    }
  }
  return getBalanceDirect(userId);
}

export async function rechargeCreditsUnified(
  userId: string,
  dollars: number,
): Promise<{ user_id: string; balance: number; dollars: number; credits: number }> {
  if (useHttpDashboard()) {
    return rechargeCredits(userId, dollars);
  }
  return rechargeCreditsDirect(userId, dollars);
}
