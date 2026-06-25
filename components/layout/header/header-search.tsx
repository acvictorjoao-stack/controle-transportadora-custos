'use client';

import {Search} from 'lucide-react';

import {SearchInput} from '@/components/forms/search-input';
import {cn} from '@/lib/utils';

export interface HeaderSearchProps {
  className?: string;
}

function HeaderSearch({className}: HeaderSearchProps) {
  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <SearchInput
        placeholder="Buscar em todo o sistema..."
        disabled
        className="w-full"
        aria-label="Pesquisa global"
      />
      <Search className="sr-only" />
    </div>
  );
}

export {HeaderSearch};
