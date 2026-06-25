import type {Metadata} from 'next';

import {fontVariables, inter} from '@/config/site/fonts';
import {siteConfig} from '@/config/site/index';
import {AppProviders} from '@/providers';
import {ThemeScript} from '@/providers/theme-script';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className={`${fontVariables} ${inter.className} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
