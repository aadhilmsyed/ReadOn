'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearClientSession,
  getClientSession,
  performMockAuth,
  type AuthMode,
} from '@orchestrators/auth/authSessionOrchestrator';
import type { SessionRecord, SessionUser } from '@shared/types/session';

interface SessionContextValue {
  session: SessionRecord | null;
  isReady: boolean;
  authenticate: (mode: AuthMode, user: SessionUser) => Promise<SessionRecord>;
  signOut: () => void;
  refreshSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(() => {
    setSession(getClientSession());
    setIsReady(true);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const authenticate = useCallback(async (mode: AuthMode, user: SessionUser) => {
    const nextSession = await performMockAuth(mode, user);
    setSession(nextSession);
    return nextSession;
  }, []);

  const signOut = useCallback(() => {
    clearClientSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, isReady, authenticate, signOut, refreshSession }),
    [authenticate, isReady, refreshSession, session, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error('useSession must be used within SessionProvider.');
  }

  return context;
}
