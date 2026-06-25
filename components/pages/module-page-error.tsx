'use client';

import {ErrorFallback} from '@/components/feedback/error-fallback';

export interface ModulePageErrorProps {
  error: Error & {digest?: string};
  reset: () => void;
}

function ModulePageError({error, reset}: ModulePageErrorProps) {
  return <ErrorFallback error={error} reset={reset} />;
}

export {ModulePageError};
