import {cva, type VariantProps} from 'class-variance-authority';
import * as React from 'react';

import {cn} from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-accent text-accent-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive/12 text-destructive',
        outline: 'text-foreground border-border',
        success:
          'border-transparent bg-success/12 text-success',
        warning:
          'border-transparent bg-warning/12 text-warning',
        info:
          'border-transparent bg-info/12 text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({className, variant, ...props}: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({variant}), className)}
      {...props}
    />
  );
}

export {Badge, badgeVariants};
