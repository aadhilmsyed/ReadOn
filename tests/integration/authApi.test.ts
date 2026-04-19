import { describe, expect, it } from 'vitest';

import { getSessionUserFromRequest } from '@/lib/auth/getSessionUser';

describe('getSessionUserFromRequest', () => {
  it('returns null without cookie', async () => {
    const req = new Request('http://localhost/api/auth/me');
    await expect(getSessionUserFromRequest(req)).resolves.toBeNull();
  });
});
