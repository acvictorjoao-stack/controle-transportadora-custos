import * as React from 'react';

import {cn} from '@/lib/utils';

export interface MainContentProps extends React.HTMLAttributes<HTMLElement> {}

function MainContent({className, children, ...props}: MainContentProps) {
  return (
    <main
      data-slot="main-content"
      className={cn('flex min-h-0 flex-1 flex-col overflow-hidden', className)}
      {...props}
    >
      {children}
    </main>
  );
}

export {MainContent};
