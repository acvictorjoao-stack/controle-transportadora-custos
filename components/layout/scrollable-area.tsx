import * as React from 'react';

import {cn} from '@/lib/utils';

export interface ScrollableAreaProps extends React.HTMLAttributes<HTMLDivElement> {}

function ScrollableArea({className, children, ...props}: ScrollableAreaProps) {
  return (
    <div
      data-slot="scrollable-area"
      className={cn('flex-1 overflow-y-auto overflow-x-hidden', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export {ScrollableArea};
