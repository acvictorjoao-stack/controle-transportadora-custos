'use client';

import type {Session} from '@supabase/supabase-js';
import * as React from 'react';

import {AuthError, logAuthError} from '@/lib/auth/auth-errors';
import {
  getClientSession,
  onAuthStateChange,
  signOutClientLocal,
} from '@/supabase/auth/client';
import type {SignInCredentials} from '@/supabase/auth/client';
import {signInAction, signOutAction} from '@/supabase/auth/actions';
import {mapSupabaseUser, type AuthUser} from '@/types/auth/user';

export interface AuthContextValue {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: SignInCredentials, returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined,
);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const applySession = React.useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ? mapSupabaseUser(nextSession.user) : null);
  }, []);

  const refreshSession = React.useCallback(async () => {
    try {
      const nextSession = await getClientSession();
      applySession(nextSession);
    } catch (error) {
      logAuthError(error, 'refreshSession');
      applySession(null);
    }
  }, [applySession]);

  React.useEffect(() => {
    let mounted = true;

    async function initSession() {
      try {
        const initialSession = await getClientSession();
        if (mounted) {
          applySession(initialSession);
        }
      } catch (error) {
        logAuthError(error, 'initSession');
        if (mounted) {
          applySession(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void initSession();

    const {
      data: {subscription},
    } = onAuthStateChange(async (_event, nextSession) => {
      applySession(nextSession);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = React.useCallback(
    async (credentials: SignInCredentials, returnTo?: string) => {
      const result = await signInAction(credentials, returnTo);

      if (result && !result.success) {
        throw new AuthError(
          result.error ?? 'Não foi possível completar a autenticação.',
          'INVALID_CREDENTIALS',
        );
      }
    },
    [],
  );

  const signOut = React.useCallback(async () => {
    applySession(null);
    await signOutClientLocal();
    await signOutAction();
  }, [applySession]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated: Boolean(user && session),
      signIn,
      signOut,
      refreshSession,
    }),
    [user, session, isLoading, signIn, signOut, refreshSession],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export {AuthContext};
