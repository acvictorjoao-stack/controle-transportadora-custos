'use client';

import Link from 'next/link';
import {usePathname, useSearchParams} from 'next/navigation';

import {buttonVariants} from '@/components/ui/button';
import {cn} from '@/lib/utils';

import type {CockpitPeriodPreset} from '../types';
import {COCKPIT_PERIOD_OPTIONS} from '../utils/period';

export interface PeriodComparativesProps {
  active: CockpitPeriodPreset;
  className?: string;
}

function PeriodComparatives({active, className}: PeriodComparativesProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2 shadow-card',
        className,
      )}
    >
      {COCKPIT_PERIOD_OPTIONS.map((option, index) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('periodo', option.id);
        const href = `${pathname}?${params.toString()}`;
        const isActive = active === option.id;

        return (
          <div key={option.id} className="flex items-center gap-2">
            {index > 0 && (
              <span className="text-muted-foreground" aria-hidden>
                ↓
              </span>
            )}
            <Link
              href={href}
              scroll={false}
              className={cn(
                buttonVariants({
                  size: 'sm',
                  variant: isActive ? 'default' : 'ghost',
                }),
              )}
            >
              {option.label}
            </Link>
          </div>
        );
      })}
    </div>
  );
}

export {PeriodComparatives};
