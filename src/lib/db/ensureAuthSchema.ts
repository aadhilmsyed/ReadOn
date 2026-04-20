import { getDashboardPool } from '@/lib/db/dashboardPool';

let ensured: Promise<void> | null = null;

/** Idempotent DDL for users + credit ledger (dashboard DB). */
export function ensureAuthSchema(): Promise<void> {
  if (!ensured) {
    ensured = runMigrations();
  }
  return ensured;
}

async function runMigrations(): Promise<void> {
  const pool = getDashboardPool();
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS credits (
        user_id TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        transaction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        credits_change INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions (user_id);
    `);

    await client.query(
      `UPDATE credits SET balance = GREATEST(balance, 1000), updated_at = now() WHERE user_id = $1`,
      ['amubarak@andrew.cmu.edu'],
    );
  } finally {
    client.release();
  }
}
