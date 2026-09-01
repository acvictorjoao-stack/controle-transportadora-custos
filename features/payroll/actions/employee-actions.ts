'use server';

import {getCostCenterById} from '@/features/cost-centers/queries';
import {getBranchById} from '@/features/organization/branches/queries';
import type {ActionResult} from '@/features/organization/shared/action-result';
import {getServerSupabaseClient} from '@/lib/auth/company';
import {zodFieldErrors} from '@/lib/validators/zod-field-errors';

import {
  createEmployee,
  getEmployeeById,
  getPositionById,
  setEmployeeStatus,
  updateEmployee,
} from '../queries';
import type {Employee} from '../types';
import {createEmployeeSchema, updateEmployeeSchema} from '../validation';
import type {CreateEmployeeInput} from '../validation';
import {
  revalidateEmployeePaths,
  resolvePayrollAccess,
} from './payroll-access';

async function validateEmployeeReferences(
  companyId: string,
  input: CreateEmployeeInput,
  options: {existingPositionId?: string | null} = {},
): Promise<ActionResult<CreateEmployeeInput>> {
  const supabase = await getServerSupabaseClient();

  const position = await getPositionById(supabase, companyId, input.positionId);
  if (!position) {
    return {
      success: false,
      error: 'Cargo não encontrado nesta empresa.',
      fieldErrors: {positionId: 'Selecione um cargo válido.'},
    };
  }

  const isPreservedCurrentPosition =
    options.existingPositionId != null && position.id === options.existingPositionId;

  if (!position.active && !isPreservedCurrentPosition) {
    return {
      success: false,
      error: 'Cargo inativo não pode ser atribuído.',
      fieldErrors: {positionId: 'Selecione um cargo ativo.'},
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

  if (input.branchId) {
    const branch = await getBranchById(supabase, companyId, input.branchId);
    if (!branch) {
      return {
        success: false,
        error: 'Filial não encontrada nesta empresa.',
        fieldErrors: {branchId: 'Selecione uma filial válida.'},
      };
    }
  }

  return {success: true, data: input};
}

export async function createEmployeeAction(input: unknown): Promise<ActionResult<Employee>> {
  const resolved = await resolvePayrollAccess('financeiro:create');
  if (!resolved.success) return resolved;

  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const references = await validateEmployeeReferences(resolved.data.companyId, parsed.data);
  if (!references.success) return references;

  try {
    const supabase = await getServerSupabaseClient();
    const employee = await createEmployee(
      supabase,
      resolved.data.companyId,
      references.data,
      resolved.data.profileId,
    );

    revalidateEmployeePaths();
    return {success: true, data: employee};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao cadastrar colaborador.',
    };
  }
}

export async function updateEmployeeAction(
  employeeId: string,
  input: unknown,
): Promise<ActionResult<Employee>> {
  const resolved = await resolvePayrollAccess('financeiro:update');
  if (!resolved.success) return resolved;

  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Verifique os campos do formulário.',
      fieldErrors: zodFieldErrors(parsed.error.issues),
    };
  }

  const supabase = await getServerSupabaseClient();
  const existing = await getEmployeeById(supabase, resolved.data.companyId, employeeId);
  if (!existing) {
    return {success: false, error: 'Funcionário não encontrado.'};
  }

  const references = await validateEmployeeReferences(resolved.data.companyId, parsed.data, {
    existingPositionId: existing.positionId,
  });
  if (!references.success) return references;

  try {
    const employee = await updateEmployee(
      supabase,
      resolved.data.companyId,
      employeeId,
      references.data,
      resolved.data.profileId,
    );

    revalidateEmployeePaths();
    return {success: true, data: employee};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar colaborador.',
    };
  }
}

export async function toggleEmployeeStatusAction(
  employeeId: string,
  active: boolean,
): Promise<ActionResult<Employee>> {
  const resolved = await resolvePayrollAccess('financeiro:update');
  if (!resolved.success) return resolved;

  try {
    const supabase = await getServerSupabaseClient();
    const employee = await setEmployeeStatus(
      supabase,
      resolved.data.companyId,
      employeeId,
      active ? 'active' : 'inactive',
      resolved.data.profileId,
    );
    revalidateEmployeePaths();
    return {success: true, data: employee};
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao alterar status.',
    };
  }
}
