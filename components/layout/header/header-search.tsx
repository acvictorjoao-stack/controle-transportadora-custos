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
        placeholder="Busca global (em breve)..."
        disabled
        className="w-full opacity-70"
        aria-label="Pesquisa global — disponível em breve"
      />
      <Search className="sr-only" />
    </div>
  );
}

export {HeaderSearch};
