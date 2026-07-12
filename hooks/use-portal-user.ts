'use client';

import * as React from 'react';

import {useAuth} from '@/contexts/auth/use-auth';
import {getPortalRoleFromUser, isOwnerRole} from '@/lib/auth/permissions';
import {getClientPortalUser} from '@/supabase/portal/client';
import type {PortalUser} from '@/types/portal/user';

export interface UsePortalUserResult {
  portalUser: PortalUser | null;
  isOwner: boolean;
  isLoading: boolean;
  refreshPortalUser: () => Promise<void>;
}

export function usePortalUser(): UsePortalUserResult {
  const {isAuthenticated, isLoading: isAuthLoading} = useAuth();
  const [portalUser, setPortalUser] = React.useState<PortalUser | null>(null);
  const [isFetching, setIsFetching] = React.useState(false);

  const refreshPortalUser = React.useCallback(async () => {
    setIsFetching(true);

    try {
      const nextPortalUser = await getClientPortalUser();
      setPortalUser(nextPortalUser);
    } catch {
      setPortalUser(null);
    } finally {
      setIsFetching(false);
    }
  }, []);

  React.useEffect(() => {
    if (isAuthLoading || !isAuthenticated) {
      return;
    }

    let cancelled = false;

    void Promise.resolve().then(() => {
      if (!cancelled) {
        setIsFetching(true);
      }
    });

    getClientPortalUser()
      .then((nextPortalUser) => {
        if (!cancelled) {
          setPortalUser(nextPortalUser);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPortalUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsFetching(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isAuthLoading]);

  const effectivePortalUser = isAuthenticated ? portalUser : null;
  const role = getPortalRoleFromUser(effectivePortalUser);

  return {
    portalUser: effectivePortalUser,
    isOwner: isOwnerRole(role),
    isLoading: isAuthLoading || (isAuthenticated && isFetching),
    refreshPortalUser,
  };
}
