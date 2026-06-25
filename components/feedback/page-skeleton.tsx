import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';

export interface PageSkeletonProps {
  className?: string;
  rows?: number;
}

function PageSkeleton({className, rows = 4}: PageSkeletonProps) {
  return (
    <div
      data-slot="page-skeleton"
      className={cn('flex flex-col gap-6 p-6', className)}
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({length: 4}).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      {Array.from({length: rows}).map((_, i) => (
        <Skeleton key={`row-${i}`} className="h-10 w-full" />
      ))}
    </div>
  );
}

export {PageSkeleton};
