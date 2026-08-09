'use client';

import * as React from 'react';
import {useTransition} from 'react';
import {Building2, Loader2} from 'lucide-react';

import {Button} from '@/components/ui/button';
import {
  enterCompanyAsMasterAction,
  switchCompanyAsMasterAction,
} from '@/features/master/company-access';

export interface MasterCompanyOption {
  id: string;
  name: string;
  document?: string | null;
  status: string;
}

interface MasterCompanyPickerProps {
  companies: MasterCompanyOption[];
  mode?: 'enter' | 'switch';
}

export function MasterCompanyPicker({
  companies,
  mode = 'enter',
}: MasterCompanyPickerProps) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  function handleSelect(companyId: string) {
    setError(null);
    setSelectedId(companyId);
    startTransition(async () => {
      const action =
        mode === 'switch' ? switchCompanyAsMasterAction : enterCompanyAsMasterAction;
      const result = await action(companyId);
      if (result && !result.success) {
        setError(result.error);
        setSelectedId(null);
      }
    });
  }

  if (companies.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Nenhuma empresa ativa disponível para acesso.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border">
        {companies.map((company) => {
          const isLoading = pending && selectedId === company.id;
          return (
            <li key={company.id}>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => handleSelect(company.id)}
                className="flex h-auto w-full items-center justify-between gap-3 rounded-none px-4 py-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Building2 className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{company.name}</span>
                    {company.document ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {company.document}
                      </span>
                    ) : null}
                  </span>
                </span>
                {isLoading ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <span className="text-xs text-muted-foreground">Abrir</span>
                )}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
