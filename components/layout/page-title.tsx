import * as React from 'react';

import {cn} from '@/lib/utils';

export interface PageTitleProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

function PageTitle({
  title,
  description,
  badge,
  actions,
  className,
  ...props
}: PageTitleProps) {
  return (
    <div
      data-slot="page-title"
      className={cn(
        'flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
      {...props}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export {PageTitle};
