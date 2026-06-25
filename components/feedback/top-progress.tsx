'use client';

import {useLoading} from '@/contexts/loading/use-loading';
import {cn} from '@/lib/utils';

function TopProgress() {
  const {isLoading, progress} = useLoading();

  if (!isLoading && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      className="fixed left-0 top-0 z-[var(--z-toast)] h-0.5 w-full bg-transparent"
    >
      <div
        className={cn(
          'h-full bg-primary transition-all duration-300 ease-out',
          progress >= 100 && 'opacity-0',
        )}
        style={{width: `${progress}%`}}
      />
    </div>
  );
}

export {TopProgress};
