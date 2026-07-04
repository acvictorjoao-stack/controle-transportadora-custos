'use client';

import {ChevronLeft, ChevronRight} from 'lucide-react';

import {Button} from '@/components/ui/button';

export interface ListPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  itemLabel: string;
  onPageChange: (page: number) => void;
}

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function ListPagination({
  page,
  pageSize,
  total,
  totalPages,
  itemLabel,
  onPageChange,
}: ListPaginationProps) {
  if (totalPages <= 1 && total === 0) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const label = pluralize(total, itemLabel, `${itemLabel}s`);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {total === 0
          ? `Nenhum ${itemLabel} encontrado`
          : `Mostrando ${start}–${end} de ${total} ${label}`}
        {totalPages > 1 && ` · Página ${page} de ${totalPages}`}
      </p>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Próxima
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export {ListPagination};
