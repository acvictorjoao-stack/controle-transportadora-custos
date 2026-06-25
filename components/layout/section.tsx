import * as React from 'react';

import {cn} from '@/lib/utils';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
}

function Section({
  title,
  description,
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <section
      data-slot="section"
      className={cn('flex flex-col gap-4', className)}
      {...props}
    >
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

export {Section};
