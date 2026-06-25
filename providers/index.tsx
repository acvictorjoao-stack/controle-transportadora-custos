import {ThemeProvider} from '@/providers/theme-provider';
import {LoadingProvider} from '@/contexts/loading/loading-context';
import {ErrorBoundary} from '@/components/feedback/error-boundary';

export function AppProviders({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </LoadingProvider>
    </ThemeProvider>
  );
}
