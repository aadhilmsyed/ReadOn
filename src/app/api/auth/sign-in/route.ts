import { NextResponse } from 'next/server';

import { authCookieOptions, AUTH_COOKIE_NAME } from '@/lib/auth/constants';
import { verifyPassword } from '@/lib/auth/password';
import { signSessionToken } from '@/lib/auth/jwt';
import { ensureAuthSchema } from '@/lib/db/ensureAuthSchema';
import { getDashboardPool } from '@/lib/db/dashboardPool';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    return NextResponse.json({ error: 'validation', message: 'Email and password are required.' }, { status: 400 });
  }

  await ensureAuthSchema();
  const pool = getDashboardPool();
  const { rows } = await pool.query<{ password_hash: string; name: string }>(
    `SELECT password_hash, name FROM users WHERE lower(email) = lower($1)`,
    [email],
  );

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'user_not_found', code: 'USER_NOT_FOUND', message: 'No account exists for this email yet.' },
      { status: 404 },
    );
  }

  const ok = await verifyPassword(password, rows[0].password_hash);
  if (!ok) {
    return NextResponse.json(
      { error: 'invalid_credentials', code: 'INVALID_PASSWORD', message: 'Incorrect password.' },
      { status: 401 },
    );
  }

  const token = await signSessionToken(email, rows[0].name);
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const res = NextResponse.json({
    ok: true,
    user: { email, name: rows[0].name },
  });
  res.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions(expires));
  return res;
}
