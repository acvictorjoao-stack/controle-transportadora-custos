'use client';

import {HomeModuleSearch} from '@/features/home-portal';
import {cn} from '@/lib/utils';

export interface HeaderSearchProps {
  className?: string;
}

function HeaderSearch({className}: HeaderSearchProps) {
  return (
    <div className={cn('relative w-full max-w-md', className)}>
      <HomeModuleSearch
        className="max-w-none"
        placeholder="Buscar módulo..."
      />
    </div>
  );
}

export {HeaderSearch};
