'use server';

import {getCostCenterById} from '@/features/cost-centers/queries';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {getServerSupabaseClient} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';

import {PAYROLL_DUPLICATE_FIELD} from '../constants';
import {
  createPayrollExpense,
  getPayrollExpenseById,
  getPayrollPersonById,
  getPositionById,
  listPayrollDuplicateCandidates,
  softDeletePayrollExpense,
  updatePayrollExpense,
} from '../queries';
import {
  removePayrollFinancialEntries,
  syncPayrollFinancialEntry,
} from '../services/payroll-financial.service';
import {buildPayrollDuplicateMessage, findPayrollDuplicate} from '../services/payroll-rules';
import type {PayrollExpense} from '../types';
import {
  createPayrollExpenseSchema,
  updatePayrollExpenseSchema,
} from '../validation';
import type {CreatePayrollExpenseInput} from '../validation';
import {revalidatePayrollPaths, resolvePayrollAccess} from './payroll-access';

/**
 * Garante que pessoa, cargo e centro de custo pertencem à empresa autenticada.
 * A origem da pessoa (motorista ou colaborador) é resolvida pelo servidor,
 * ignorando o valor informado pelo client.
 */
async function resolveReferences(
  companyId: string,
  input: CreatePayrollExpenseInput,
): Promise<ActionResult<CreatePayrollExpenseInput>> {
  const supabase = await getServerSupabaseClient();

  const person = await getPayrollPersonById(supabase, companyId, input.personId);
  if (!person) {
    return {
      success: false,
      error: 'Funcionário não encontrado nesta empresa.',
      fieldErrors: {personId: 'Selecione um funcionário válido.'},
    };
  }

  const costCenter = await getCostCenterById(supabase, companyId, input.costCenterId);
  if (!costCenter) {
    return {
      success: false,
      error: 'Centro de custo não encontrado nesta empresa.',
      fieldErrors: {costCenterId: 'Selecione um centro de custo válido.'},
    };
  }

  if (input.positionId) {
    const position = await getPositionById(supabase, companyId, input.positionId);
    if (!position) {
      return {
        success: false,
        error: 'Cargo não encontrado nesta empresa.',
        fieldErrors: {positionId: 'Selecione um cargo válido.'},
      };
    }
  }

  return {
    success: true,
    data: {
      ...input,
      personKind: person.kind,
      // Filial só é aceita quando derivada do cadastro da pessoa.
      branchId: null,
    },
  };
}

async function assertNoAccidentalDuplicate(
  companyId: string,
  input: CreatePayrollExpenseInput,
  currentExpenseId: string | null,
): Promise<ActionResult<null>> {
  if (input.confirmDuplicate) {
    return {success: true, data: null};
  }

  const supabase = await getServerSupabaseClient();
  const candidates = await listPayrollDuplicateCandidates(supabase, companyId, {
    personId: input.personId,
    competence: input.competence,
    expenseType: input.expenseType,
  });

  const duplicate = findPayrollDuplicate(candidates, {
    id: currentExpenseId,
    personId: input.personId,
    competence: input.competence,
    expenseType: input.expenseType,
  });

  if (!duplicate) {
    return {success: true, data: null};
  }

  const message = buildPayrollDuplicateMessage(input);
  return {
    success: false,
    error: message,
    fieldErrors: {[PAYROLL_DUPLICATE_FIELD]: message},
  };
}

export async function createPayrollExpenseAction(
  input: unknown,
): Promise<ActionResult<PayrollExpense>> {
  const resolved = await resolvePayrollAccess('financeiro:create');
  if (!resolved.success) return resolved;

  const parsed = createPayrollExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const references = await resolveReferences(resolved.data.companyId, parsed.data);
  if (!references.success) return references;

  const duplicateCheck = await assertNoAccidentalDuplicate(
    resolved.data.companyId,
    references.data,
    null,
  );
  if (!duplicateCheck.success) return duplicateCheck;

  try {
    const supabase = await getServerSupabaseClient();
    const expense = await createPayrollExpense(
      supabase,
      resolved.data.companyId,
      references.data,
      resolved.data.profileId,
    );

    try {
      await syncFinancial(resolved.data.companyId, expense, resolved.data.profileId);
    } catch (error) {
      try {
        await removePayrollFinancialEntries(
          supabase,
          resolved.data.companyId,
          expense.id,
          resolved.data.profileId,
        );
        await softDeletePayrollExpense(
          supabase,
          resolved.data.companyId,
          expense.id,
          resolved.data.profileId,
        );
      } catch (rollbackError) {
        const originalMessage =
          error instanceof Error ? error.message : 'erro financeiro desconhecido';
        const rollbackMessage =
          rollbackError instanceof Error ? rollbackError.message : 'erro desconhecido';
        throw new Error(
          `Não foi possível sincronizar a despesa de pessoal: ${originalMessage}. ` +
            `A compensação também falhou: ${rollbackMessage}.`,
        );
      }
      throw error;
    }
    revalidatePayrollPaths();

    return {success: true, data: expense};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao criar despesa de pessoal.',
    };
  }
}

export async function updatePayrollExpenseAction(
  expenseId: string,
  input: unknown,
): Promise<ActionResult<PayrollExpense>> {
  const resolved = await resolvePayrollAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = updatePayrollExpenseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const references = await resolveReferences(resolved.data.companyId, parsed.data);
  if (!references.success) return references;

  const duplicateCheck = await assertNoAccidentalDuplicate(
    resolved.data.companyId,
    references.data,
    expenseId,
  );
  if (!duplicateCheck.success) return duplicateCheck;

  try {
    const supabase = await getServerSupabaseClient();
    const existing = await getPayrollExpenseById(supabase, resolved.data.companyId, expenseId);
    if (!existing) {
      return {success: false, error: 'Despesa de pessoal não encontrada.'};
    }
    if (existing.expenseStatus === 'paid' && references.data.expenseStatus === 'pending') {
      return {
        success: false,
        error:
          'Não é possível voltar uma despesa de pessoal paga para pendente; trate a baixa financeira antes de editar.',
      };
    }

    const expense = await updatePayrollExpense(
      supabase,
      resolved.data.companyId,
      expenseId,
      references.data,
      resolved.data.profileId,
    );

    try {
      await syncFinancial(resolved.data.companyId, expense, resolved.data.profileId);
    } catch (error) {
      try {
        const previousInput = {
          personKind: existing.personKind,
          personId: existing.personId,
          positionId: existing.positionId,
          costCenterId: existing.costCenterId,
          branchId: existing.branchId,
          competence: existing.competence,
          expenseType: existing.expenseType,
          expenseStatus: existing.expenseStatus,
          amount: existing.amount,
          paymentMethod: existing.paymentMethod,
          dueDate: existing.dueDate,
          paidAt: existing.paidAt,
          notes: existing.notes,
          confirmDuplicate: true,
        };
        const restored = await updatePayrollExpense(
          supabase,
          resolved.data.companyId,
          existing.id,
          previousInput,
          resolved.data.profileId,
        );
        await syncFinancial(resolved.data.companyId, restored, resolved.data.profileId);
      } catch (rollbackError) {
        const originalMessage =
          error instanceof Error ? error.message : 'erro financeiro desconhecido';
        const rollbackMessage =
          rollbackError instanceof Error ? rollbackError.message : 'erro desconhecido';
        throw new Error(
          `Não foi possível sincronizar a despesa de pessoal: ${originalMessage}. ` +
            `A restauração também falhou: ${rollbackMessage}.`,
        );
      }
      throw error;
    }
    revalidatePayrollPaths();

    return {success: true, data: expense};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar despesa de pessoal.',
    };
  }
}

export async function deletePayrollExpenseAction(
  expenseId: string,
): Promise<ActionResult<void>> {
  const resolved = await resolvePayrollAccess('financeiro:delete');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const existing = await getPayrollExpenseById(supabase, resolved.data.companyId, expenseId);
    if (!existing) {
      return {success: false, error: 'Despesa de pessoal não encontrada.'};
    }

    // Estorna o lançamento antes de arquivar a despesa, como nos módulos operacionais.
    await removePayrollFinancialEntries(
      supabase,
      resolved.data.companyId,
      expenseId,
      resolved.data.profileId,
    );

    await softDeletePayrollExpense(
      supabase,
      resolved.data.companyId,
      expenseId,
      resolved.data.profileId,
    );

    revalidatePayrollPaths();
    return {success: true, data: undefined};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao excluir despesa de pessoal.',
    };
  }
}

async function syncFinancial(
  companyId: string,
  expense: PayrollExpense,
  profileId: string,
): Promise<void> {
  const supabase = await getServerSupabaseClient();
  await syncPayrollFinancialEntry(supabase, companyId, expense, profileId);
}
