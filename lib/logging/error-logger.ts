export interface ErrorLogEntry {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url?: string;
}

/**
 * Logger de erros — preparado para integração com Sentry/Datadog.
 */
export function logError(error: Error, componentStack?: string): ErrorLogEntry {
  const entry: ErrorLogEntry = {
    message: error.message,
    stack: error.stack,
    componentStack,
    timestamp: new Date().toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('[FleetControl Error]', entry);
  }

  return entry;
}
