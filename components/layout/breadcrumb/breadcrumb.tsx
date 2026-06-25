'use client';

import {ChevronRight} from 'lucide-react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';

import {buildBreadcrumbs} from '@/lib/navigation/breadcrumb';
import {cn} from '@/lib/utils';

export interface BreadcrumbProps {
  className?: string;
}

function Breadcrumb({className}: BreadcrumbProps) {
  const pathname = usePathname();
  const items = buildBreadcrumbs(pathname);

  if (items.length <= 1) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className={cn(
                    isLast ? 'font-medium text-foreground' : 'text-muted-foreground',
                  )}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export {Breadcrumb};
