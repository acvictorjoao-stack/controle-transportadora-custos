import * as React from 'react';

import {cn} from '@/lib/utils';

export interface ActionBarProps extends React.HTMLAttributes<HTMLDivElement> {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

function ActionBar({
  leading,
  trailing,
  className,
  children,
  ...props
}: ActionBarProps) {
  return (
    <div
      data-slot="action-bar"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      {...props}
    >
      {leading && <div className="flex items-center gap-2">{leading}</div>}
      {children}
      {trailing && (
        <div className="flex items-center gap-2 sm:ml-auto">{trailing}</div>
      )}
    </div>
  );
}

export {ActionBar};
