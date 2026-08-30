import type {SupabaseClient} from '@supabase/supabase-js';

import {PAYROLL_SOURCE_MODULE} from '@/features/financial/constants/operation-financial';
import {
  getFinancialEntryById,
  softDeleteFinancialEntry,
} from '@/features/financial/queries/financial-entries';
import {upsertFinancialInstallmentsFromOperation} from '@/features/financial/services/operation-financial.service';

import {PAYROLL_CATEGORY_SLUG} from '../constants';
import type {PayrollExpense} from '../types';
import {buildPayrollDescription, resolvePayrollFinancialPlan} from './payroll-rules';

/**
 * Lançamentos ativos gerados por uma despesa de folha.
 * A busca usa o par (source_module, source_id) — a folha não possui FK própria
 * em financial_entries, e o índice único da migration 091 garante unicidade.
 */
interface PayrollFinancialEntryState {
  id: string;
  entryStatus: string;
  paidAmount: number | null;
}

async function listPayrollFinancialEntries(
  supabase: SupabaseClient,
  companyId: string,
  payrollExpenseId: string,
): Promise<PayrollFinancialEntryState[]> {
  const {data, error} = await supabase
    .from('financial_entries')
    .select('id, entry_status, paid_amount')
    .eq('company_id', companyId)
    .eq('source_module', PAYROLL_SOURCE_MODULE)
    .eq('source_id', payrollExpenseId)
    .is('deleted_at', null)
    .neq('entry_status', 'reversed')
    .neq('entry_type', 'reversal');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    entryStatus: row.entry_status as string,
    paidAmount: row.paid_amount == null ? null : Number(row.paid_amount),
  }));
}

/** Estorna os lançamentos da despesa (cancelamento ou exclusão). */
export async function removePayrollFinancialEntries(
  supabase: SupabaseClient,
  companyId: string,
  payrollExpenseId: string,
  profileId: string,
): Promise<void> {
  const entries = await listPayrollFinancialEntries(supabase, companyId, payrollExpenseId);

  for (const entry of entries) {
    await softDeleteFinancialEntry(supabase, companyId, entry.id, profileId);
  }
}

/**
 * Cria ou atualiza o lançamento financeiro da despesa de folha.
 * Idempotente: reexecutar com a mesma despesa atualiza o lançamento existente.
 */
export async function syncPayrollFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  expense: PayrollExpense,
  profileId: string,
): Promise<void> {
  const plan = resolvePayrollFinancialPlan({
    expenseStatus: expense.expenseStatus,
    competence: expense.competence,
    dueDate: expense.dueDate,
    paidAt: expense.paidAt,
  });

  const existing = await listPayrollFinancialEntries(supabase, companyId, expense.id);

  if (plan.action === 'remove') {
    await removePayrollFinancialEntries(supabase, companyId, expense.id, profileId);
    return;
  }

  await upsertFinancialInstallmentsFromOperation(
    supabase,
    companyId,
    {
      sourceModule: PAYROLL_SOURCE_MODULE,
      sourceId: expense.id,
      paymentType: plan.paymentType,
      amount: expense.amount,
      entryDate: plan.entryDate,
      dueDate: plan.dueDate,
      installmentCount: 1,
      description: buildPayrollDescription({
        personName: expense.personName,
        positionName: expense.positionName,
        expenseType: expense.expenseType,
        competence: expense.competence,
      }),
      categorySlug: PAYROLL_CATEGORY_SLUG,
      branchId: expense.branchId,
      // Custo de pessoal não é rateado por veículo/viagem, e o vínculo com o
      // motorista permanece na despesa de folha para não alterar as análises
      // de rentabilidade operacional já existentes.
      vehicleId: null,
      driverId: null,
      tripId: null,
      notes: expense.notes,
      paidAt: plan.paidAt,
      // Centro de custo explícito: a folha não usa o mapeamento automático
      // para OPERACIONAL dos módulos operacionais.
      costCenterId: expense.costCenterId,
      failOnCleanupError: true,
      metadata: {
        payroll_expense_type: expense.expenseType,
        payroll_competence: expense.competence,
        payroll_person_kind: expense.personKind,
        payroll_person_id: expense.personId,
        payroll_position_id: expense.positionId,
      },
    },
    profileId,
  );
}

/** Indica se a despesa possui lançamento financeiro ativo. */
export async function hasPayrollFinancialEntry(
  supabase: SupabaseClient,
  companyId: string,
  payrollExpenseId: string,
): Promise<boolean> {
  const entries = await listPayrollFinancialEntries(supabase, companyId, payrollExpenseId);
  if (entries.length === 0) return false;

  const entry = await getFinancialEntryById(supabase, companyId, entries[0].id);
  return entry != null;
}
