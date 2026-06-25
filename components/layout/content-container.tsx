import * as React from 'react';

import {cn} from '@/lib/utils';

export interface ContentContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

function ContentContainer({
  className,
  children,
  ...props
}: ContentContainerProps) {
  return (
    <div
      data-slot="content-container"
      className={cn('flex flex-col gap-6 p-6', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export {ContentContainer};
