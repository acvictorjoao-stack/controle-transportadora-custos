'use client';

import {ChevronsUpDown, Plus, Search} from 'lucide-react';
import * as React from 'react';

import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';

import {useSupplierOptions} from '../hooks/use-supplier-options';
import type {Supplier, SupplierCategory, SupplierSelectOption} from '../types';
import {SUPPLIER_CATEGORY_LABELS} from '../types';
import {formatDocument} from '../utils/supplier-format';
import {SupplierQuickCreateModal} from './supplier-quick-create-modal';

export interface SupplierSelectProps {
  value: string | null;
  onChange: (supplierId: string | null, option: SupplierSelectOption | null) => void;
  options: SupplierSelectOption[];
  onOptionsChange?: (options: SupplierSelectOption[]) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  allowQuickCreate?: boolean;
  defaultCategories?: SupplierCategory[];
  className?: string;
}

function matchesSearch(option: SupplierSelectOption, term: string): boolean {
  if (!term) return true;
  const q = term.toLowerCase();
  const digits = q.replace(/\D/g, '');
  const categoryLabels = option.categories
    .map((c) => SUPPLIER_CATEGORY_LABELS[c] ?? c)
    .join(' ')
    .toLowerCase();
  return (
    option.displayName.toLowerCase().includes(q) ||
    option.corporateName.toLowerCase().includes(q) ||
    (option.tradeName?.toLowerCase().includes(q) ?? false) ||
    (digits.length > 0 && (option.document?.includes(digits) ?? false)) ||
    (option.document?.toLowerCase().includes(q) ?? false) ||
    categoryLabels.includes(q) ||
    (option.city?.toLowerCase().includes(q) ?? false)
  );
}

function SupplierSelect({
  value,
  onChange,
  options: initialOptions,
  onOptionsChange,
  error,
  required,
  disabled,
  placeholder = 'Selecione o fornecedor',
  id = 'supplier-select',
  allowQuickCreate = true,
  defaultCategories,
  className,
}: SupplierSelectProps) {
  const {options, onOptionsChange: mergeExtras} = useSupplierOptions(initialOptions);
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [quickOpen, setQuickOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const selected = options.find((o) => o.id === value) ?? null;

  const filtered = React.useMemo(
    () => options.filter((o) => matchesSearch(o, debouncedSearch)),
    [options, debouncedSearch],
  );

  function publishOptions(next: SupplierSelectOption[]) {
    mergeExtras(next);
    onOptionsChange?.(next);
  }

  function handleSelect(option: SupplierSelectOption) {
    onChange(option.id, option);
    setOpen(false);
    setSearch('');
  }

  function handleClear() {
    onChange(null, null);
    setOpen(false);
    setSearch('');
  }

  function handleCreated(supplier: Supplier) {
    const option: SupplierSelectOption = {
      id: supplier.id,
      displayName: supplier.displayName,
      corporateName: supplier.corporateName,
      tradeName: supplier.tradeName,
      document: supplier.document,
      categories: supplier.categories,
      city: supplier.city,
      state: supplier.state,
      active: supplier.active,
    };
    const next = [option, ...options.filter((o) => o.id !== option.id)];
    publishOptions(next);
    onChange(option.id, option);
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <div className="flex gap-2">
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-9 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selected ? 'truncate' : 'truncate text-muted-foreground'}>
            {selected ? selected.displayName : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>

        {allowQuickCreate && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={disabled}
            title="Novo fornecedor"
            aria-label="Novo fornecedor"
            onClick={() => setQuickOpen(true)}
          >
            <Plus className="size-4" />
          </Button>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md"
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, fantasia, CNPJ, CPF, categoria…"
              className="h-8 border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-y-auto py-1">
            {!required && (
              <li>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted"
                  onClick={handleClear}
                >
                  — Nenhum —
                </button>
              </li>
            )}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                Nenhum fornecedor encontrado
              </li>
            )}
            {filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === value}
                  className={
                    option.id === value
                      ? 'w-full bg-accent px-3 py-2 text-left text-sm'
                      : 'w-full px-3 py-2 text-left text-sm hover:bg-muted'
                  }
                  onClick={() => handleSelect(option)}
                >
                  <span className="block font-medium">{option.displayName}</span>
                  <span className="block text-xs text-muted-foreground">
                    {[
                      formatDocument(option.document),
                      option.categories
                        .map((c) => SUPPLIER_CATEGORY_LABELS[c])
                        .filter(Boolean)
                        .join(', '),
                      [option.city, option.state].filter(Boolean).join('/'),
                    ]
                      .filter((part) => part && part !== '—')
                      .join(' · ')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {quickOpen ? (
        <SupplierQuickCreateModal
          open={quickOpen}
          onClose={() => setQuickOpen(false)}
          defaultCategories={defaultCategories}
          onCreated={handleCreated}
        />
      ) : null}
    </div>
  );
}

export {SupplierSelect};
