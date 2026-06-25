import * as React from 'react';

import {EmptyState} from '@/components/common/empty-state';
import {Skeleton} from '@/components/ui/skeleton';
import {cn} from '@/lib/utils';

export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

function DataTable<T>({
  columns,
  data,
  getRowKey,
  loading = false,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription = 'Não há dados para exibir no momento.',
  className,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className={cn('space-y-3 p-6', className)}>
        {Array.from({length: 5}).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className="m-6 border-none bg-transparent"
      />
    );
  }

  return (
    <table
      data-slot="data-table"
      className={cn('w-full caption-bottom text-sm', className)}
    >
      <thead>
        <tr className="border-b border-border bg-muted/40">
          {columns.map((column) => (
            <th
              key={column.id}
              className={cn(
                'h-10 px-4 text-left align-middle text-xs font-medium uppercase tracking-wider text-muted-foreground',
                column.headerClassName,
              )}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr
            key={getRowKey(row)}
            className="border-b border-border transition-colors last:border-0 hover:bg-muted/30"
          >
            {columns.map((column) => (
              <td
                key={column.id}
                className={cn('px-4 py-3 align-middle', column.className)}
              >
                {column.cell(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export {DataTable};
