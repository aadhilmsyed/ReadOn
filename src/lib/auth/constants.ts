export const AUTH_COOKIE_NAME = process.env.READON_AUTH_COOKIE_NAME?.trim() || 'readon_session';

export function authCookieOptions(expires: Date) {
  const secure = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true as const,
    secure,
    sameSite: 'lax' as const,
    path: '/',
    expires,
  };
}
