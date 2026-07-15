import type {SupabaseClient} from '@supabase/supabase-js';

import {ACCOUNTS_PAYABLE_SOURCE_MODULE} from '@/features/accounts-payable/constants';
import {ACCOUNTS_RECEIVABLE_SOURCE_MODULE} from '@/features/accounts-receivable/constants';
import {CASH_FLOW_SOURCE_MODULES} from '@/features/cash-flow/constants';
import {getCashFlowSummary} from '@/features/cash-flow/queries';
import {
  getCashFlowAmount,
  getCashFlowPerson,
  getCashFlowType,
} from '@/features/cash-flow/utils/cash-flow-mappers';
import {listFinancialEntries} from '@/features/financial/queries';
import type {FinancialEntryStatus} from '@/features/financial/types';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {FINANCIAL_DASHBOARD_UPCOMING_LIMIT} from '../constants';
import type {FinancialDashboardData} from '../types';
import {localDateIso, paidAtDateIso, startOfMonthIso} from '../utils/dates';

type MetricRow = {
  entry_type: string;
  entry_status: FinancialEntryStatus;
  amount: number;
  paid_amount: number | null;
  source_module: string | null;
  due_date: string | null;
  paid_at: string | null;
};

function isOpenStatus(status: FinancialEntryStatus): boolean {
  return status === 'pending' || status === 'overdue';
}

function isReceivable(row: Pick<MetricRow, 'source_module' | 'entry_type'>): boolean {
  return row.source_module === ACCOUNTS_RECEIVABLE_SOURCE_MODULE || row.entry_type === 'revenue';
}

function isPayable(row: Pick<MetricRow, 'source_module' | 'entry_type'>): boolean {
  return row.source_module === ACCOUNTS_PAYABLE_SOURCE_MODULE || row.entry_type === 'expense';
}

function rowAmount(row: MetricRow): number {
  if (row.entry_status === 'paid' && row.paid_amount != null) {
    return Number(row.paid_amount);
  }
  return Number(row.amount);
}

function isOverdueOpen(row: MetricRow, today: string): boolean {
  if (!isOpenStatus(row.entry_status)) return false;
  if (row.entry_status === 'overdue') return true;
  return Boolean(row.due_date && row.due_date < today);
}

export async function getFinancialDashboardData(
  supabase: SupabaseClient,
  companyId: string,
): Promise<FinancialDashboardData> {
  const today = localDateIso();
  const monthStart = startOfMonthIso();

  const [summary, metricsResult, upcoming] = await Promise.all([
    getCashFlowSummary(supabase, companyId),
    supabase
      .from('financial_entries')
      .select('entry_type, entry_status, amount, paid_amount, source_module, due_date, paid_at')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .in('source_module', [...CASH_FLOW_SOURCE_MODULES])
      .in('entry_status', ['pending', 'overdue', 'paid']),
    listFinancialEntries(supabase, {
      companyId,
      page: 1,
      pageSize: FINANCIAL_DASHBOARD_UPCOMING_LIMIT,
      filters: {
        sourceModules: [...CASH_FLOW_SOURCE_MODULES],
        entryStatuses: ['pending', 'overdue'],
        dueDateFrom: today,
      },
      sort: {sortBy: 'due_date', sortOrder: 'asc'},
    }),
  ]);

  if (metricsResult.error) {
    throw new Error(mapDatabaseError(metricsResult.error));
  }

  const rows = (metricsResult.data ?? []) as MetricRow[];

  let receberQtd = 0;
  let pagarQtd = 0;
  let recebidoMes = 0;
  let recebidoHoje = 0;
  let pagoMes = 0;
  let pagoHoje = 0;
  let vencidasReceber = 0;
  let vencidasPagar = 0;

  for (const row of rows) {
    const amount = rowAmount(row);
    const receivable = isReceivable(row);
    const payable = isPayable(row);

    if (isOpenStatus(row.entry_status)) {
      if (receivable) receberQtd += 1;
      if (payable) pagarQtd += 1;

      if (isOverdueOpen(row, today)) {
        if (receivable) vencidasReceber += amount;
        if (payable) vencidasPagar += amount;
      }
      continue;
    }

    if (row.entry_status !== 'paid') continue;

    const paidDate = paidAtDateIso(row.paid_at);
    if (!paidDate) continue;

    if (receivable) {
      if (paidDate >= monthStart && paidDate <= today) recebidoMes += amount;
      if (paidDate === today) recebidoHoje += amount;
    }

    if (payable) {
      if (paidDate >= monthStart && paidDate <= today) pagoMes += amount;
      if (paidDate === today) pagoHoje += amount;
    }
  }

  const proximosVencimentos = upcoming.items.map((entry) => {
    const cashFlowType = getCashFlowType(entry) ?? 'pagamento';
    return {
      id: entry.id,
      dueDate: entry.dueDate,
      cashFlowType,
      personName: getCashFlowPerson(entry),
      amount: getCashFlowAmount(entry),
      currency: entry.currency || 'BRL',
      entryStatus: entry.entryStatus,
    };
  });

  return {
    summary,
    contasAReceber: {
      total: summary.aReceber,
      quantidade: receberQtd,
    },
    contasAPagar: {
      total: summary.aPagar,
      quantidade: pagarQtd,
    },
    recebimentos: {
      mes: recebidoMes,
      hoje: recebidoHoje,
    },
    pagamentos: {
      mes: pagoMes,
      hoje: pagoHoje,
    },
    inadimplencia: {
      aReceber: vencidasReceber,
      aPagar: vencidasPagar,
    },
    proximosVencimentos,
    resumo: {
      totalRecebido: summary.entradasRecebidas,
      totalPago: summary.saidasPagas,
      resultado: summary.saldoAtual,
    },
  };
}
