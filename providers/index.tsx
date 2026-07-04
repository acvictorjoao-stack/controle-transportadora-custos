import {ThemeProvider} from '@/providers/theme-provider';
import {AppAuthProvider} from '@/providers/auth-provider';
import {ConfirmProvider} from '@/contexts/feedback/confirm-context';
import {ToastProvider} from '@/contexts/feedback/toast-context';
import {LoadingProvider} from '@/contexts/loading/loading-context';
import {ErrorBoundary} from '@/components/feedback/error-boundary';

export function AppProviders({children}: {children: React.ReactNode}) {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppAuthProvider>
              <ErrorBoundary>{children}</ErrorBoundary>
            </AppAuthProvider>
          </ConfirmProvider>
        </ToastProvider>
      </LoadingProvider>
    </ThemeProvider>
  );
}
