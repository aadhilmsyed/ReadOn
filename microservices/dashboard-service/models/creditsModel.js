// Credits model — backed by the `credits` table in the `dashboard` DB.
// All mutations are atomic so concurrent button clicks cannot oversell.

const { dashboardPool } = require('../db/pools');

const MAX_RECHARGE_DOLLARS = 1000;
const DOLLAR_TO_CREDITS    = 100;

function normalizeUserId(userId) {
  if (typeof userId !== 'string' || userId.trim().length === 0) {
    const err = new Error('invalid_user_id'); err.code = 'INVALID_USER_ID'; throw err;
  }
  return userId.trim().toLowerCase();
}

async function ensureRow(uid) {
  await dashboardPool().query(
    `INSERT INTO credits (user_id, balance) VALUES ($1, 0)
     ON CONFLICT (user_id) DO NOTHING`,
    [uid],
  );
}

async function getBalance(userId) {
  const uid = normalizeUserId(userId);
  await ensureRow(uid);
  const { rows } = await dashboardPool().query(
    `SELECT balance FROM credits WHERE user_id = $1`,
    [uid],
  );
  return { user_id: uid, balance: rows[0].balance };
}

async function recharge(userId, dollars) {
  const uid = normalizeUserId(userId);
  if (!Number.isInteger(dollars) || dollars <= 0 || dollars > MAX_RECHARGE_DOLLARS) {
    const err = new Error('invalid_dollars'); err.code = 'INVALID_DOLLARS'; throw err;
  }
  const credits = dollars * DOLLAR_TO_CREDITS;
  const { rows } = await dashboardPool().query(
    `INSERT INTO credits (user_id, balance, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id) DO UPDATE
       SET balance = credits.balance + EXCLUDED.balance,
           updated_at = now()
     RETURNING balance`,
    [uid, credits],
  );
  return { user_id: uid, balance: rows[0].balance, dollars, credits };
}

async function charge(userId, amount, reason) {
  const uid = normalizeUserId(userId);
  if (!Number.isInteger(amount) || amount <= 0) {
    const err = new Error('invalid_amount'); err.code = 'INVALID_AMOUNT'; throw err;
  }
  await ensureRow(uid);
  const { rows } = await dashboardPool().query(
    `UPDATE credits
       SET balance = balance - $2, updated_at = now()
     WHERE user_id = $1 AND balance >= $2
     RETURNING balance`,
    [uid, amount],
  );
  if (rows.length === 0) {
    const err = new Error('insufficient_credits'); err.code = 'INSUFFICIENT_CREDITS'; throw err;
  }
  return { user_id: uid, balance: rows[0].balance, charged: amount, reason: reason || '' };
}

module.exports = { getBalance, recharge, charge, DOLLAR_TO_CREDITS, MAX_RECHARGE_DOLLARS };
