import { describe, expect, it, beforeAll } from 'vitest';

import { signSessionToken, verifySessionToken } from '@/lib/auth/jwt';

describe('jwt session', () => {
  beforeAll(() => {
    process.env.READON_AUTH_SECRET = 'test-secret-key-at-least-32-chars-long!!';
  });

  it('round-trips email and name', async () => {
    const token = await signSessionToken('learner@example.com', 'Test Learner');
    const payload = await verifySessionToken(token);
    expect(payload?.sub).toBe('learner@example.com');
    expect(payload?.name).toBe('Test Learner');
  });

  it('rejects garbage', async () => {
    await expect(verifySessionToken('not-a-jwt')).resolves.toBeNull();
  });
});
