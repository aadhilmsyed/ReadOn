'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { SessionRecord, SessionUser } from '@shared/types/session';

interface SessionContextValue {
  session: SessionRecord | null;
  isReady: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [isReady, setIsReady] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json()) as { authenticated?: boolean; user?: SessionUser };
      if (data.authenticated && data.user?.email) {
        setSession({ user: { email: data.user.email, name: data.user.name } });
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    setSession(null);
    router.push('/');
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ session, isReady, refreshSession, signOut }),
    [isReady, refreshSession, session, signOut],
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
