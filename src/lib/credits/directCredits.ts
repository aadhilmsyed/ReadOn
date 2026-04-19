import { getDashboardPool } from '@/lib/db/dashboardPool';
import { ensureAuthSchema } from '@/lib/db/ensureAuthSchema';

function normalizeUserId(userId: string): string {
  return userId.trim().toLowerCase();
}

export interface ChargeResult {
  user_id: string;
  balance: number;
  charged: number;
  reason: string;
}

/** In-process credit charge when dashboard microservice HTTP URL is not configured. */
export async function chargeCreditsDirect(userId: string, amount: number, reason: string): Promise<ChargeResult> {
  await ensureAuthSchema();
  const uid = normalizeUserId(userId);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('invalid_amount');
  }

  const pool = getDashboardPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO credits (user_id, balance) VALUES ($1, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [uid],
    );

    const { rows } = await client.query<{ balance: number }>(
      `UPDATE credits
         SET balance = balance - $2, updated_at = now()
       WHERE user_id = $1 AND balance >= $2
       RETURNING balance`,
      [uid, amount],
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      const err = new Error('insufficient_credits');
      (err as Error & { code?: string }).code = 'INSUFFICIENT_CREDITS';
      throw err;
    }

    await client.query(
      `INSERT INTO credit_transactions (user_id, amount, credits_change, description)
       VALUES ($1, $2, $3, $4)`,
      [uid, amount, -amount, reason || ''],
    );

    await client.query('COMMIT');
    return { user_id: uid, balance: rows[0].balance, charged: amount, reason: reason || '' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

const DOLLAR_TO_CREDITS = 100;
const MAX_RECHARGE_DOLLARS = 1000;

export async function rechargeCreditsDirect(
  userId: string,
  dollars: number,
): Promise<{ user_id: string; balance: number; dollars: number; credits: number }> {
  await ensureAuthSchema();
  const uid = normalizeUserId(userId);
  if (!Number.isInteger(dollars) || dollars <= 0 || dollars > MAX_RECHARGE_DOLLARS) {
    throw new Error('invalid_dollars');
  }
  const credits = dollars * DOLLAR_TO_CREDITS;
  const pool = getDashboardPool();
  await pool.query(
    `INSERT INTO credits (user_id, balance) VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [uid],
  );
  const { rows } = await pool.query<{ balance: number }>(
    `UPDATE credits
       SET balance = balance + $2, updated_at = now()
     WHERE user_id = $1
     RETURNING balance`,
    [uid, credits],
  );
  await pool.query(
    `INSERT INTO credit_transactions (user_id, amount, credits_change, description)
     VALUES ($1, $2, $3, $4)`,
    [uid, 0, credits, `recharge_${dollars}usd`],
  );
  return { user_id: uid, balance: rows[0].balance, dollars, credits };
}

export async function getBalanceDirect(userId: string): Promise<{ user_id: string; balance: number }> {
  await ensureAuthSchema();
  const uid = normalizeUserId(userId);
  const pool = getDashboardPool();
  await pool.query(
    `INSERT INTO credits (user_id, balance) VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [uid],
  );
  const { rows } = await pool.query<{ balance: number }>(
    `SELECT balance FROM credits WHERE user_id = $1`,
    [uid],
  );
  return { user_id: uid, balance: rows[0]?.balance ?? 0 };
}
