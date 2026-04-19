import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from '@/lib/auth/password';

describe('password', () => {
  it('hashes and verifies', async () => {
    const h = await hashPassword('secret-password-99');
    expect(h).not.toContain('secret');
    await expect(verifyPassword('secret-password-99', h)).resolves.toBe(true);
    await expect(verifyPassword('wrong', h)).resolves.toBe(false);
  });
});
