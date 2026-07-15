'use client';

import Link from 'next/link';

import {DataTable} from '@/components/data-display/data-table';
import {StatCard} from '@/components/data-display/stat-card';
import {TableContainer} from '@/components/data-display/table-container';
import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {Badge} from '@/components/ui/badge';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {ROUTES} from '@/constants/routes/paths';
import {CASH_FLOW_TYPE_LABELS} from '@/features/cash-flow/constants';
import {
  ACCOUNTS_PAYABLE_STATUS_LABELS,
  ACCOUNTS_RECEIVABLE_STATUS_LABELS,
} from '@/features/financial/types/financial-entry';
import {formatCurrencyBr, formatDateBr} from '@/features/financial/utils/financial-format';
import type {FinancialEntryStatus} from '@/features/financial/types';

import type {
  FinancialDashboardData,
  FinancialDashboardUpcomingRow,
} from '../types';

export interface FinancialDashboardViewProps {
  data: FinancialDashboardData;
  error: string | null;
}

function detailHref(row: FinancialDashboardUpcomingRow): string {
  if (row.cashFlowType === 'recebimento') {
    return ROUTES.contasAReceberDetail(row.id);
  }
  return ROUTES.contasAPagarDetail(row.id);
}

function statusLabel(row: FinancialDashboardUpcomingRow): string {
  const status = row.entryStatus;
  if (row.cashFlowType === 'recebimento') {
    if (status === 'pending' || status === 'overdue') {
      return ACCOUNTS_RECEIVABLE_STATUS_LABELS.pending;
    }
    if (status === 'paid' || status === 'cancelled') {
      return ACCOUNTS_RECEIVABLE_STATUS_LABELS[status];
    }
    return status;
  }

  if (status === 'pending' || status === 'overdue') {
    return ACCOUNTS_PAYABLE_STATUS_LABELS.pending;
  }
  if (status === 'paid' || status === 'cancelled') {
    return ACCOUNTS_PAYABLE_STATUS_LABELS[status];
  }
  return status;
}

function statusVariant(
  status: FinancialEntryStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'overdue') return 'destructive';
  if (status === 'paid') return 'default';
  if (status === 'pending') return 'secondary';
  return 'outline';
}

function formatCount(value: number): string {
  return value.toLocaleString('pt-BR');
}

function FinancialDashboardView({data, error}: FinancialDashboardViewProps) {
  const {summary} = data;

  const columns = [
    {
      id: 'dueDate',
      header: 'Data',
      cell: (row: FinancialDashboardUpcomingRow) => (
        <Link href={detailHref(row)} className="hover:underline">
          {formatDateBr(row.dueDate)}
        </Link>
      ),
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (row: FinancialDashboardUpcomingRow) => (
        <Badge variant={row.cashFlowType === 'recebimento' ? 'default' : 'destructive'}>
          {CASH_FLOW_TYPE_LABELS[row.cashFlowType]}
        </Badge>
      ),
    },
    {
      id: 'person',
      header: 'Pessoa',
      cell: (row: FinancialDashboardUpcomingRow) => (
        <Link href={detailHref(row)} className="text-sm font-medium hover:underline">
          {row.personName ?? '—'}
        </Link>
      ),
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row: FinancialDashboardUpcomingRow) =>
        formatCurrencyBr(row.amount, row.currency),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row: FinancialDashboardUpcomingRow) => (
        <Badge variant={statusVariant(row.entryStatus)}>{statusLabel(row)}</Badge>
      ),
    },
  ];

  return (
    <PageTemplate
      title="Dashboard Financeiro"
      description="Visão consolidada de contas a pagar, contas a receber e fluxo de caixa"
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-6">
        <Section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
              title="Contas a Receber"
              value={
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyBr(data.contasAReceber.total)}
                </span>
              }
              subtitle={`${formatCount(data.contasAReceber.quantidade)} conta(s) em aberto`}
            />
            <StatCard
              title="Contas a Pagar"
              value={
                <span className="text-red-600 dark:text-red-400">
                  {formatCurrencyBr(data.contasAPagar.total)}
                </span>
              }
              subtitle={`${formatCount(data.contasAPagar.quantidade)} conta(s) em aberto`}
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
        </Section>

        <Section>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Recebimentos"
              value={
                <span className="text-emerald-600 dark:text-emerald-400">
                  {formatCurrencyBr(data.recebimentos.mes)}
                </span>
              }
              subtitle="Recebido no mês"
              footer={
                <p className="text-sm text-muted-foreground">
                  Recebido hoje:{' '}
                  <span className="font-financial font-medium text-foreground">
                    {formatCurrencyBr(data.recebimentos.hoje)}
                  </span>
                </p>
              }
            />
            <StatCard
              title="Pagamentos"
              value={
                <span className="text-red-600 dark:text-red-400">
                  {formatCurrencyBr(data.pagamentos.mes)}
                </span>
              }
              subtitle="Pago no mês"
              footer={
                <p className="text-sm text-muted-foreground">
                  Pago hoje:{' '}
                  <span className="font-financial font-medium text-foreground">
                    {formatCurrencyBr(data.pagamentos.hoje)}
                  </span>
                </p>
              }
            />
            <StatCard
              title="Inadimplência"
              value={
                <span className="text-red-600 dark:text-red-400">
                  {formatCurrencyBr(data.inadimplencia.aReceber)}
                </span>
              }
              subtitle="Contas vencidas a receber"
            />
            <StatCard
              title="Contas vencidas"
              value={
                <span className="text-red-600 dark:text-red-400">
                  {formatCurrencyBr(data.inadimplencia.aPagar)}
                </span>
              }
              subtitle="Contas vencidas a pagar"
            />
          </div>
        </Section>

        <Section title="Próximos vencimentos">
          <TableContainer>
            <DataTable
              columns={columns}
              data={data.proximosVencimentos}
              getRowKey={(row) => row.id}
              emptyTitle="Nenhum vencimento próximo"
              emptyDescription="Não há contas a pagar ou a receber com vencimento a partir de hoje."
            />
          </TableContainer>
        </Section>

        <Section title="Resumo financeiro">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resultado consolidado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total recebido
                  </p>
                  <p className="mt-2 font-financial text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrencyBr(data.resumo.totalRecebido)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Total pago
                  </p>
                  <p className="mt-2 font-financial text-xl font-semibold text-red-600 dark:text-red-400">
                    {formatCurrencyBr(data.resumo.totalPago)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Resultado
                  </p>
                  <p
                    className={`mt-2 font-financial text-xl font-semibold ${
                      data.resumo.resultado < 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {formatCurrencyBr(data.resumo.resultado)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>
      </div>
    </PageTemplate>
  );
}

export {FinancialDashboardView};
