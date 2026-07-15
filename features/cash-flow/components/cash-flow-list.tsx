'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import * as React from 'react';

import {DataTable} from '@/components/data-display/data-table';
import {ListPagination} from '@/components/data-display/list-pagination';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {SearchInput} from '@/components/forms/search-input';
import {PageTemplate} from '@/components/layout/page-template';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {ROUTES} from '@/constants/routes/paths';
import {formatCurrencyBr, formatDateBr} from '@/features/financial/utils/financial-format';

import {CASH_FLOW_TYPE_LABELS} from '../constants';
import type {
  CashFlowLine,
  CashFlowListFilters,
  CashFlowSummary,
  PaginatedCashFlow,
} from '../types';
import {buildCashFlowListUrl} from '../utils/list-url';
import {CashFlowFilters} from './cash-flow-filters';

export interface CashFlowListProps {
  initialData: PaginatedCashFlow;
  summary: CashFlowSummary;
  initialSearch: string;
  initialFilters: CashFlowListFilters;
  error: string | null;
}

function detailHref(row: CashFlowLine): string {
  if (row.cashFlowType === 'recebimento') {
    return ROUTES.contasAReceberDetail(row.id);
  }
  return ROUTES.contasAPagarDetail(row.id);
}

function typeBadgeVariant(
  type: CashFlowLine['cashFlowType'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  return type === 'recebimento' ? 'default' : 'destructive';
}

function CashFlowList({
  initialData,
  summary,
  initialSearch,
  initialFilters,
  error,
}: CashFlowListProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState(initialSearch);
  const data = initialData;

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search === initialSearch) return;
      router.push(
        buildCashFlowListUrl({
          search,
          page: 1,
          filters: initialFilters,
        }),
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, initialSearch, initialFilters, router]);

  function handlePageChange(page: number) {
    router.push(
      buildCashFlowListUrl({
        search,
        page,
        filters: initialFilters,
      }),
    );
  }

  const columns = [
    {
      id: 'movementDate',
      header: 'Data',
      cell: (row: CashFlowLine) => formatDateBr(row.movementDate),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (row: CashFlowLine) => (
        <Badge variant={typeBadgeVariant(row.cashFlowType)}>
          {CASH_FLOW_TYPE_LABELS[row.cashFlowType]}
        </Badge>
      ),
    },
    {
      id: 'person',
      header: 'Pessoa',
      cell: (row: CashFlowLine) => row.personName ?? '—',
    },
    {
      id: 'description',
      header: 'Descrição',
      cell: (row: CashFlowLine) => (
        <Link href={detailHref(row)} className="text-sm font-medium hover:underline">
          {row.description ?? '—'}
        </Link>
      ),
    },
    {
      id: 'entrada',
      header: 'Entrada',
      cell: (row: CashFlowLine) =>
        row.entrada != null ? (
          <span className="font-financial text-emerald-600 dark:text-emerald-400">
            {formatCurrencyBr(row.entrada, row.currency)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'saida',
      header: 'Saída',
      cell: (row: CashFlowLine) =>
        row.saida != null ? (
          <span className="font-financial text-red-600 dark:text-red-400">
            {formatCurrencyBr(row.saida, row.currency)}
          </span>
        ) : (
          '—'
        ),
    },
    {
      id: 'saldo',
      header: 'Saldo',
      cell: (row: CashFlowLine) => (
        <span className="font-financial font-medium text-blue-600 dark:text-blue-400">
          {formatCurrencyBr(row.runningBalance, row.currency)}
        </span>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Fluxo de Caixa"
      description="Consolidação diária de contas a pagar e contas a receber"
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Saldo Atual"
          value={
            <span className="text-blue-600 dark:text-blue-400">
              {formatCurrencyBr(summary.saldoAtual)}
            </span>
          }
          subtitle={`${formatCurrencyBr(summary.entradasRecebidas)} − ${formatCurrencyBr(summary.saidasPagas)}`}
        />
        <StatCard
          title="A Receber"
          value={
            <span className="text-emerald-600 dark:text-emerald-400">
              {formatCurrencyBr(summary.aReceber)}
            </span>
          }
          subtitle="Contas em aberto"
        />
        <StatCard
          title="A Pagar"
          value={
            <span className="text-red-600 dark:text-red-400">
              {formatCurrencyBr(summary.aPagar)}
            </span>
          }
          subtitle="Contas em aberto"
        />
        <StatCard
          title="Saldo Projetado"
          value={
            <span className="text-blue-600 dark:text-blue-400">
              {formatCurrencyBr(summary.saldoProjetado)}
            </span>
          }
          subtitle="Saldo atual + a receber − a pagar"
        />
      </div>

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Buscar por cliente, fornecedor ou descrição..."
          className="max-w-md"
        />
      </div>

      <CashFlowFilters initialFilters={initialFilters} />

      <TableContainer className="mt-4">
        <DataTable
          columns={columns}
          data={data.items}
          getRowKey={(row) => row.id}
          emptyTitle="Nenhum lançamento no fluxo de caixa"
          emptyDescription="Os lançamentos de Contas a Pagar e Contas a Receber aparecerão aqui automaticamente."
        />
      </TableContainer>

      <ListPagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        totalPages={data.totalPages}
        itemLabel="lançamento"
        onPageChange={handlePageChange}
      />
    </PageTemplate>
  );
}

export {CashFlowList};
