'use client';

import {ChevronDown, ListFilter} from 'lucide-react';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

export interface FiltersDisclosureProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Recolhe os filtros no celular para a tabela aparecer sem rolagem longa.
 * A partir de `sm` ficam sempre visíveis; continuam montados nos dois casos.
 */
function FiltersDisclosure({children, className}: FiltersDisclosureProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div data-slot="filters-disclosure" className={cn('w-full', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-between sm:hidden"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="inline-flex items-center gap-2">
          <ListFilter className="size-4" aria-hidden="true" />
          Filtros
        </span>
        <ChevronDown
          className={cn('size-4 transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </Button>
      <div className={cn('mt-3 sm:mt-0 sm:block', !open && 'hidden')}>
        {children}
      </div>
    </div>
  );
}

export {FiltersDisclosure};
