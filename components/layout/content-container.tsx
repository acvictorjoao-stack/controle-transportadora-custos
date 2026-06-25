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
      className={cn(
        'mx-auto flex w-full max-w-[1920px] flex-col gap-4 p-4 sm:gap-5 sm:p-5 lg:p-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {ContentContainer};
