import {Loader2} from 'lucide-react';

import {cn} from '@/lib/utils';

export interface PageLoaderProps {
  label?: string;
  className?: string;
}

function PageLoader({label = 'Carregando...', className}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'flex min-h-[50vh] flex-col items-center justify-center gap-3',
        className,
      )}
    >
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export {PageLoader};
