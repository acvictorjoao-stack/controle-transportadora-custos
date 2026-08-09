import * as React from 'react';

import {cn} from '@/lib/utils';

export interface TableContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  toolbar?: React.ReactNode;
}

function TableContainer({
  title,
  description,
  toolbar,
  className,
  children,
  ...props
}: TableContainerProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        // No overflow-y / overflow-hidden here: the card must grow with rows so the
        // page (ScrollableArea) scrolls — not an inner table scrollbar.
        'rounded-xl border border-border bg-card shadow-card',
        className,
      )}
      {...props}
    >
      {(title || description || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && (
              <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}
      {/* Horizontal scroll only. overflow-y-clip avoids the CSS quirk where
          overflow-x:auto forces overflow-y:auto (nested vertical scrollbar). */}
      <div className="overflow-x-auto overflow-y-clip">{children}</div>
    </div>
  );
}

export {TableContainer};
