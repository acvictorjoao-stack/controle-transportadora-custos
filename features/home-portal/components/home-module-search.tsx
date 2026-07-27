'use client';

import * as React from 'react';

import {SearchInput} from '@/components/forms/search-input';
import {cn} from '@/lib/utils';

import {useModuleSearch} from '../hooks/use-module-search';

export interface HomeModuleSearchProps {
  className?: string;
  placeholder?: string;
}

function HomeModuleSearch({
  className,
  placeholder = 'Buscar módulo...',
}: HomeModuleSearchProps) {
  const {query, setQuery, results, openModule} = useModuleSearch(6);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const showResults = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className={cn('relative w-full max-w-xl', className)}>
      <SearchInput
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && results[0]) {
            event.preventDefault();
            openModule(results[0].href);
            setOpen(false);
          }
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        aria-label="Buscar módulo"
        aria-expanded={showResults}
        aria-controls="home-module-search-results"
        autoComplete="off"
      />

      {showResults && (
        <ul
          id="home-module-search-results"
          role="listbox"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-border bg-popover p-1 shadow-lg"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              Nenhum módulo encontrado.
            </li>
          ) : (
            results.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} role="option">
                  <button
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm',
                      'hover:bg-accent hover:text-accent-foreground',
                    )}
                    onClick={() => {
                      openModule(item.href);
                      setOpen(false);
                    }}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="hidden truncate text-xs text-muted-foreground sm:inline">
                        {item.description}
                      </span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

export {HomeModuleSearch};
