'use client';

import {useAuth} from '@/contexts/auth/use-auth';
import type {AuthUser} from '@/types/auth/user';

export function useUser(): {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
} {
  const {user, isLoading, isAuthenticated} = useAuth();
  return {user, isLoading, isAuthenticated};
}
