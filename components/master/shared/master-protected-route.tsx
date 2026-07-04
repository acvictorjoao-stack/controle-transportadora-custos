'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {PageLoader} from '@/components/feedback/page-loader';
import {ROUTES} from '@/constants/routes/paths';
import {useAuth} from '@/contexts/auth/use-auth';
import {usePortalUser} from '@/hooks/use-portal-user';
import {getLoginUrl} from '@/lib/auth/redirect';

export interface MasterProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guarda client-side do Portal Master.
 * Exige autenticação e papel OWNER (portal_users).
 */
function MasterProtectedRoute({children, fallback}: MasterProtectedRouteProps) {
  const router = useRouter();
  const {isLoading: isAuthLoading, isAuthenticated} = useAuth();
  const {isOwner, isLoading: isPortalLoading} = usePortalUser();

  const isLoading = isAuthLoading || isPortalLoading;

  React.useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(getLoginUrl(window.location.pathname));
      return;
    }

    if (!isOwner) {
      router.replace(ROUTES.dashboard);
    }
  }, [isLoading, isAuthenticated, isOwner, router]);

  if (isLoading) {
    return fallback ?? <PageLoader />;
  }

  if (!isAuthenticated || !isOwner) {
    return null;
  }

  return <>{children}</>;
}

export {MasterProtectedRoute};
