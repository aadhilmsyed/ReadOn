'use client';

import type { SessionRecord, SessionStrategy, SessionUser } from '../types/session';

const SESSION_STORAGE_KEY = 'readon.mock.session';

export class LocalStorageSessionStrategy implements SessionStrategy {
  getSession(): SessionRecord | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as SessionRecord;
    } catch {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
  }

  createSession(user: SessionUser): SessionRecord {
    const session: SessionRecord = {
      token: `mock-session-${Date.now()}`,
      user,
      issuedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }

    return session;
  }

  clearSession(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }
}

export const localStorageSessionStrategy = new LocalStorageSessionStrategy();
