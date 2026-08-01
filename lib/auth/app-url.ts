import {headers} from 'next/headers';

import {siteConfig} from '@/config/site';

/**
 * Resolve a URL base da aplicação para redirects do Supabase Auth.
 * Prefere NEXT_PUBLIC_APP_URL; fallback para Host da requisição.
 */
export async function getAppBaseUrl(): Promise<string> {
  const configured = siteConfig.url;
  if (configured) {
    return configured;
  }

  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http';

  if (host) {
    return `${proto}://${host}`;
  }

  return 'http://localhost:3000';
}
