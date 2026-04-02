'use client';

import { localStorageSessionStrategy } from '@shared/session/localStorageSessionStrategy';
import type { SessionRecord, SessionUser } from '@shared/types/session';

export type AuthMode = 'sign-in' | 'sign-up';

function normalizeUser(user: SessionUser): SessionUser {
  return {
    name: user.name.trim() || 'ReadOn Learner',
    email: user.email.trim().toLowerCase(),
  };
}

export function getClientSession(): SessionRecord | null {
  return localStorageSessionStrategy.getSession();
}

export async function performMockAuth(mode: AuthMode, user: SessionUser): Promise<SessionRecord> {
  const normalizedUser = normalizeUser(user);

  if (!normalizedUser.email) {
    throw new Error('Email is required to create a mock session.');
  }

  const fallbackName = mode === 'sign-up' ? 'New ReadOn Learner' : 'Returning ReadOn Learner';
  return localStorageSessionStrategy.createSession({
    ...normalizedUser,
    name: normalizedUser.name || fallbackName,
  });
}

export function clearClientSession(): void {
  localStorageSessionStrategy.clearSession();
}
