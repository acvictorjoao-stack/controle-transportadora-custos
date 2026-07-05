import type {Metadata} from 'next';

import {siteConfig} from '@/config/site/index';

export function createRootMetadata(): Metadata {
  const appUrl = siteConfig.url;
  const metadataBase = appUrl ? new URL(`${appUrl}/`) : undefined;

  return {
    metadataBase,
    title: {
      default: siteConfig.name,
      template: `%s | ${siteConfig.name}`,
    },
    description: siteConfig.description,
    keywords: [...siteConfig.keywords],
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: siteConfig.name,
      title: siteConfig.name,
      description: siteConfig.description,
      ...(appUrl ? {url: appUrl} : {}),
    },
    twitter: {
      card: 'summary',
      title: siteConfig.name,
      description: siteConfig.description,
    },
  };
}
