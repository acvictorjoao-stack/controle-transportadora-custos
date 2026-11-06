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
        'mx-auto flex w-full max-w-[1920px] flex-col gap-5 p-4 sm:gap-6 sm:p-6 lg:p-8',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {ContentContainer};
