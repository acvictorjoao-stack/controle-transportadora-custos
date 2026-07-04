'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {PageLoader} from '@/components/feedback/page-loader';
import {ROUTES} from '@/constants/routes/paths';
import {useAuth} from '@/contexts/auth/use-auth';
import {getLoginUrl} from '@/lib/auth/redirect';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function ProtectedRoute({children, fallback}: ProtectedRouteProps) {
  const router = useRouter();
  const {isLoading, isAuthenticated} = useAuth();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(getLoginUrl(window.location.pathname));
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return fallback ?? <PageLoader />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

export {ProtectedRoute};
