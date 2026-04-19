import { NextResponse } from 'next/server';

import { hashPassword } from '@/lib/auth/password';
import { ensureAuthSchema } from '@/lib/db/ensureAuthSchema';
import { getDashboardPool } from '@/lib/db/dashboardPool';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function defaultSignupCredits(): number {
  return Number(process.env.READON_DEFAULT_SIGNUP_CREDITS ?? '100');
}

export async function POST(request: Request) {
  let body: { name?: unknown; email?: unknown; password?: unknown; confirmPassword?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const emailRaw = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const confirm = typeof body.confirmPassword === 'string' ? body.confirmPassword : '';

  if (!name || name.length > 200) {
    return NextResponse.json({ error: 'validation', field: 'name', message: 'Name is required.' }, { status: 400 });
  }
  if (!emailRaw || !EMAIL_RE.test(emailRaw)) {
    return NextResponse.json({ error: 'validation', field: 'email', message: 'Valid email is required.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: 'validation', field: 'password', message: 'Password must be at least 8 characters.' },
      { status: 400 },
    );
  }
  if (password !== confirm) {
    return NextResponse.json({ error: 'validation', field: 'confirmPassword', message: 'Passwords do not match.' }, { status: 400 });
  }

  await ensureAuthSchema();
  const pool = getDashboardPool();
  const passwordHash = await hashPassword(password);

  const testBonus = emailRaw === 'amubarak@andrew.cmu.edu' ? 1000 : defaultSignupCredits();

  try {
    const { rows } = await pool.query<{ user_id: string }>(
      `INSERT INTO users (email, name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id`,
      [emailRaw, name, passwordHash],
    );
    const uid = rows[0].user_id;

    await pool.query(
      `INSERT INTO credits (user_id, balance, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now()`,
      [emailRaw, testBonus],
    );

    await pool.query(
      `INSERT INTO credit_transactions (user_id, amount, credits_change, description)
       VALUES ($1, 0, $2, $3)`,
      [emailRaw, testBonus, 'initial_signup'],
    );

    return NextResponse.json({ ok: true, userId: uid, email: emailRaw });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'user_exists', message: 'An account with this email already exists.', code: 'USER_EXISTS' },
        { status: 409 },
      );
    }
    throw e;
  }
}
