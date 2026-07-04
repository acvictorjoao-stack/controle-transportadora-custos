'use client';

import {ChevronLeft, ChevronRight, Download} from 'lucide-react';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {ROUTES} from '@/constants/routes/paths';
import {
  PORTAL_AUDIT_ACTION_LABELS,
  type PortalAuditAction,
} from '@/features/master/audit';
import {exportAuditLogsAction} from '@/features/master/logs/actions/export-logs';
import type {AuditActionFilter, PaginatedAuditLogs} from '@/features/master/logs/queries/audit-logs';

export interface AuditLogsListProps {
  initialData: PaginatedAuditLogs | null;
  initialSearch: string;
  initialPage: number;
  initialAction: AuditActionFilter;
  initialDateFrom: string;
  initialDateTo: string;
  error: string | null;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR');
}

function buildListUrl(options: {
  search: string;
  page: number;
  action: AuditActionFilter;
  dateFrom: string;
  dateTo: string;
}): string {
  const params = new URLSearchParams();
  if (options.search.trim()) params.set('q', options.search.trim());
  if (options.page > 1) params.set('page', String(options.page));
  if (options.action !== 'all') params.set('action', options.action);
  if (options.dateFrom) params.set('from', options.dateFrom);
  if (options.dateTo) params.set('to', options.dateTo);
  const query = params.toString();
  return query ? `${ROUTES.masterLogs}?${query}` : ROUTES.masterLogs;
}

function AuditLogsList({
  initialData,
  initialSearch,
  initialPage,
  initialAction,
  initialDateFrom,
  initialDateTo,
  error,
}: AuditLogsListProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(initialSearch);
  const [exporting, setExporting] = React.useState(false);
  const [exportError, setExportError] = React.useState<string | null>(null);

  const items = initialData?.items ?? [];
  const total = initialData?.total ?? 0;
  const page = initialData?.page ?? initialPage;
  const totalPages = initialData?.totalPages ?? 1;

  const listOptions = React.useMemo(
    () => ({
      search: initialSearch,
      page,
      action: initialAction,
      dateFrom: initialDateFrom,
      dateTo: initialDateTo,
    }),
    [initialSearch, page, initialAction, initialDateFrom, initialDateTo],
  );

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(buildListUrl({...listOptions, search, page: 1}));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, router, listOptions]);

  function handleFilterChange(key: 'action' | 'dateFrom' | 'dateTo', value: string) {
    router.push(
      buildListUrl({
        ...listOptions,
        [key]: key === 'action' ? (value || 'all') : value,
        page: 1,
      }),
    );
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      const result = await exportAuditLogsAction({
        search: initialSearch || undefined,
        action: initialAction,
        dateFrom: initialDateFrom || undefined,
        dateTo: initialDateTo || undefined,
      });

      if (!result.success) {
        setExportError(result.error);
        return;
      }

      const blob = new Blob([result.csv], {type: 'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const selectClassName =
    'flex h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30';

  const inputClassName =
    'flex h-9 rounded-lg border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30';

  const columns = [
    {
      id: 'createdAt',
      header: 'Data',
      cell: (row: (typeof items)[number]) => formatDateTime(row.createdAt),
    },
    {
      id: 'action',
      header: 'Ação',
      cell: (row: (typeof items)[number]) => (
        <Badge variant="secondary">{row.actionLabel}</Badge>
      ),
    },
    {
      id: 'actor',
      header: 'Ator',
      cell: (row: (typeof items)[number]) => row.actorEmail ?? '—',
    },
    {
      id: 'target',
      header: 'Alvo',
      cell: (row: (typeof items)[number]) => (
        <div className="max-w-xs truncate">
          {row.targetLabel ?? row.targetId ?? '—'}
        </div>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (row: (typeof items)[number]) => row.targetType ?? '—',
    },
  ];

  return (
    <TableContainer
      title="Logs de auditoria"
      description={`${total} evento(s) registrado(s)`}
      toolbar={
        <>
          <SearchInput
            value={search}
            onValueChange={setSearch}
            placeholder="Buscar por ator, alvo ou ID..."
            className="w-full sm:w-64"
          />
          <select
            aria-label="Filtrar por ação"
            value={initialAction === 'all' ? '' : initialAction}
            onChange={(e) => handleFilterChange('action', e.target.value)}
            className={selectClassName}
          >
            <option value="">Todas as ações</option>
            {(Object.keys(PORTAL_AUDIT_ACTION_LABELS) as PortalAuditAction[]).map(
              (action) => (
                <option key={action} value={action}>
                  {PORTAL_AUDIT_ACTION_LABELS[action]}
                </option>
              ),
            )}
          </select>
          <input
            type="date"
            aria-label="Data inicial"
            value={initialDateFrom}
            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            className={inputClassName}
          />
          <input
            type="date"
            aria-label="Data final"
            value={initialDateTo}
            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            className={inputClassName}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => void handleExport()}
            loading={exporting}
          >
            <Download className="size-4" />
            Exportar CSV
          </Button>
        </>
      }
    >
      {(error || exportError) && (
        <div className="px-6 pt-4">
          <Alert variant="destructive">
            <AlertDescription>{error ?? exportError}</AlertDescription>
          </Alert>
        </div>
      )}

      <DataTable
        columns={columns}
        data={items}
        getRowKey={(row) => row.id}
        emptyTitle="Nenhum log encontrado"
        emptyDescription="Os eventos de auditoria aparecerão aqui."
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() =>
                router.push(buildListUrl({...listOptions, page: page - 1}))
              }
            >
              <ChevronLeft className="size-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() =>
                router.push(buildListUrl({...listOptions, page: page + 1}))
              }
            >
              Próxima
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </TableContainer>
  );
}

export {AuditLogsList};
