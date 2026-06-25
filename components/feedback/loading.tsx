import {Loader2} from 'lucide-react';
import * as React from 'react';

import {cn} from '@/lib/utils';

export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const sizeMap = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const;

function Loading({size = 'md', label, className, ...props}: LoadingProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Carregando'}
      className={cn('inline-flex items-center gap-2 text-muted-foreground', className)}
      {...props}
    >
      <Loader2 className={cn('animate-spin', sizeMap[size])} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export {Loading};
