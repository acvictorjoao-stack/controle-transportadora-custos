import {ThemeProvider} from '@/providers/theme-provider';

export function AppProviders({children}: {children: React.ReactNode}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
