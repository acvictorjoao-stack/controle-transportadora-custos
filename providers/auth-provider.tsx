'use client';

import {AuthProvider} from '@/contexts/auth/auth-context';

export function AppAuthProvider({children}: {children: React.ReactNode}) {
  return <AuthProvider>{children}</AuthProvider>;
}

export {AuthProvider};
