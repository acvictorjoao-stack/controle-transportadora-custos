'use client';

import type {Session} from '@supabase/supabase-js';

import {useAuth} from '@/contexts/auth/use-auth';

export function useSession(): {
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshSession: () => Promise<void>;
} {
  const {session, isLoading, isAuthenticated, refreshSession} = useAuth();
  return {session, isLoading, isAuthenticated, refreshSession};
}
