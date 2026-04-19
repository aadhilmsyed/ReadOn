import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export interface ReadOnJwtPayload extends JWTPayload {
  sub: string;
  name: string;
}

function getSecretKey(): Uint8Array {
  const raw = process.env.READON_AUTH_SECRET?.trim();
  if (!raw || raw === 'REPLACE_ME') {
    throw new Error('READON_AUTH_SECRET must be set to a long random string (not REPLACE_ME).');
  }
  return new TextEncoder().encode(raw);
}

export async function signSessionToken(email: string, name: string): Promise<string> {
  const key = getSecretKey();
  return new SignJWT({ name })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(email.toLowerCase())
    .setIssuedAt()
    .setExpirationTime(process.env.READON_AUTH_SESSION_TTL ?? '7d')
    .sign(key);
}

export async function verifySessionToken(token: string): Promise<ReadOnJwtPayload | null> {
  try {
    const key = getSecretKey();
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    const email = typeof payload.sub === 'string' ? payload.sub : '';
    const name = typeof payload.name === 'string' ? payload.name : '';
    if (!email) return null;
    return { ...payload, sub: email, name: name || email };
  } catch {
    return null;
  }
}
