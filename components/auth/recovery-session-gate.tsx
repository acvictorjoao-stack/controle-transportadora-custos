'use client';

import {useRouter} from 'next/navigation';
import * as React from 'react';

import {UpdatePasswordForm} from '@/components/auth/update-password-form';
import {getRecoveryInvalidLoginUrl} from '@/lib/auth/redirect';
import {getClientSession, getClientUser} from '@/supabase/auth/client';

function parseHashKeys(hash: string): string[] {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!raw) return [];
  return [...new URLSearchParams(raw).keys()];
}

/**
 * Garante sessão de recovery antes do formulário.
 * Cobre cookies pós-callback e fragmento implícito (#access_token).
 */
function RecoverySessionGate() {
  const router = useRouter();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function ensureSession() {
      const hashKeys = parseHashKeys(window.location.hash);

      try {
        // createBrowserClient detecta hash/code na URL no init.
        let session = await getClientSession();
        let user = session?.user ?? (await getClientUser().catch(() => null));

        if (!user && hashKeys.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 150));
          session = await getClientSession();
          user = session?.user ?? (await getClientUser().catch(() => null));
        }

        if (cancelled) return;

        if (!user) {
          router.replace(getRecoveryInvalidLoginUrl());
          return;
        }

        if (window.location.hash) {
          window.history.replaceState(
            null,
            '',
            `${window.location.pathname}${window.location.search}`,
          );
        }

        setReady(true);
      } catch {
        if (!cancelled) {
          router.replace(getRecoveryInvalidLoginUrl());
        }
      }
    }

    void ensureSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        Validando link de recuperação…
      </p>
    );
  }

  return <UpdatePasswordForm />;
}

export {RecoverySessionGate};
