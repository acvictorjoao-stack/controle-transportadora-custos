'use client';

import {cn} from '@/lib/utils';

export interface TabsNavItem<T extends string> {
  id: T;
  label: string;
}

export interface TabsNavProps<T extends string> {
  items: readonly TabsNavItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}

/** Abas das telas de detalhe; rolam na horizontal em telas estreitas. */
function TabsNav<T extends string>({
  items,
  value,
  onChange,
  className,
}: TabsNavProps<T>) {
  return (
    <div
      role="tablist"
      data-slot="tabs-nav"
      className={cn(
        'flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn(
              '-mb-px cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export {TabsNav};
