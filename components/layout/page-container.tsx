import * as React from 'react';

import {cn} from '@/lib/utils';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const maxWidthMap = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
} as const;

function PageContainer({
  className,
  maxWidth = '2xl',
  children,
  ...props
}: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      className={cn(
        'mx-auto w-full px-6 py-8',
        maxWidthMap[maxWidth],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export {PageContainer};
