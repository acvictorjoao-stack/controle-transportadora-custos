'use client';

import * as React from 'react';

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
  const [portalUser, setPortalUser] = React.useState<PortalUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refreshPortalUser = React.useCallback(async () => {
    setIsLoading(true);

    try {
      const nextPortalUser = await getClientPortalUser();
      setPortalUser(nextPortalUser);
    } catch {
      setPortalUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

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
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const role = getPortalRoleFromUser(portalUser);

  return {
    portalUser,
    isOwner: isOwnerRole(role),
    isLoading,
    refreshPortalUser,
  };
}
