import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import type {EntityStatus} from '@/features/organization/companies/types';

import {EMPLOYEE_LIST_COLUMNS, EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS, EMPLOYEES_PAGE_SIZE} from '../constants';
import {mapEmployeeListRow, mapEmployeeRow} from '../services/mappers';
import type {Employee, EmployeeListItem, EmployeeRow, PaginatedEmployees, PayrollPersonOption} from '../types';
import type {CreateEmployeeInput, UpdateEmployeeInput} from '../validation';

function buildEmployeePayload(
  input: CreateEmployeeInput | UpdateEmployeeInput,
  profileId: string,
): Record<string, unknown> {
  return {
    name: input.name,
    position_id: input.positionId,
    cost_center_id: input.costCenterId,
    branch_id: input.branchId,
    cpf: input.cpf,
    registration_number: input.registrationNumber,
    email: input.email,
    phone: input.phone,
    contract_type: input.contractType,
    hired_at: input.hiredAt,
    terminated_at: input.terminatedAt,
    notes: input.notes,
    status: input.status ?? 'active',
    updated_by: profileId,
  };
}

export async function listEmployees(
  supabase: SupabaseClient,
  companyId: string,
  options: {activeOnly?: boolean} = {},
): Promise<Employee[]> {
  let query = supabase
    .from('employees')
    .select(EMPLOYEE_LIST_COLUMNS)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('name', {ascending: true});

  if (options.activeOnly !== false) {
    query = query.eq('status', 'active');
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapEmployeeRow(row as unknown as EmployeeRow));
}

export interface ListEmployeesOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listEmployeesPaginated(
  supabase: SupabaseClient,
  options: ListEmployeesOptions,
): Promise<PaginatedEmployees> {
  const search = options.search?.trim() ?? '';
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? EMPLOYEES_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('employees')
    .select(EMPLOYEE_LIST_WITH_RELATIONS_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null)
    .order('name', {ascending: true});

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,cpf.ilike.%${search}%,registration_number.ilike.%${search}%,email.ilike.%${search}%`,
    );
  }

  const {data, error, count} = await query.range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) => mapEmployeeListRow(row as never)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getEmployeeById(
  supabase: SupabaseClient,
  companyId: string,
  employeeId: string,
): Promise<Employee | null> {
  const {data, error} = await supabase
    .from('employees')
    .select(EMPLOYEE_LIST_COLUMNS)
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapEmployeeRow(data as unknown as EmployeeRow);
}

export async function createEmployee(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateEmployeeInput,
  profileId: string,
): Promise<Employee> {
  const {data, error} = await supabase
    .from('employees')
    .insert({
      ...buildEmployeePayload(input, profileId),
      company_id: companyId,
      created_by: profileId,
    })
    .select(EMPLOYEE_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapEmployeeRow(data as unknown as EmployeeRow);
}

export async function updateEmployee(
  supabase: SupabaseClient,
  companyId: string,
  employeeId: string,
  input: UpdateEmployeeInput,
  profileId: string,
): Promise<Employee> {
  const {data, error} = await supabase
    .from('employees')
    .update(buildEmployeePayload(input, profileId))
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(EMPLOYEE_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapEmployeeRow(data as unknown as EmployeeRow);
}

export async function softDeleteEmployee(
  supabase: SupabaseClient,
  companyId: string,
  employeeId: string,
  profileId: string,
): Promise<void> {
  const {count, error: countError} = await supabase
    .from('payroll_expenses')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .eq('employee_id', employeeId)
    .is('deleted_at', null);

  if (countError) {
    throw new Error(mapDatabaseError(countError));
  }

  if ((count ?? 0) > 0) {
    throw new Error(
      'Não é possível excluir: existem despesas de pessoal vinculadas a este colaborador.',
    );
  }

  const {error} = await supabase
    .from('employees')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function setEmployeeStatus(
  supabase: SupabaseClient,
  companyId: string,
  employeeId: string,
  status: Extract<EntityStatus, 'active' | 'inactive'>,
  profileId: string,
): Promise<Employee> {
  const {data, error} = await supabase
    .from('employees')
    .update({status, updated_by: profileId})
    .eq('id', employeeId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(EMPLOYEE_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapEmployeeRow(data as unknown as EmployeeRow);
}

/**
 * Pessoas elegíveis à folha: motoristas do cadastro operacional (sem duplicar
 * cadastro) e colaboradores. Lê a view payroll_people (security_invoker).
 */
export async function listPayrollPeople(
  supabase: SupabaseClient,
  companyId: string,
  options: {search?: string; limit?: number} = {},
): Promise<PayrollPersonOption[]> {
  const limit = options.limit ?? 500;
  const search = options.search?.replace(/[%(),]/g, '').trim();

  let query = supabase
    .from('payroll_people')
    .select('id, person_kind, name, position_id, cost_center_id, active')
    .eq('company_id', companyId)
    .eq('active', true)
    .order('name', {ascending: true})
    .limit(limit);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.person_kind === 'driver' ? 'driver' : 'employee',
    name: row.name as string,
    positionId: (row.position_id as string | null) ?? null,
    costCenterId: (row.cost_center_id as string | null) ?? null,
    active: Boolean(row.active),
  }));
}

/**
 * Valida no servidor que a pessoa pertence à empresa autenticada e resolve a
 * origem real do cadastro (motorista ou colaborador).
 */
export async function getPayrollPersonById(
  supabase: SupabaseClient,
  companyId: string,
  personId: string,
): Promise<PayrollPersonOption | null> {
  const {data, error} = await supabase
    .from('payroll_people')
    .select('id, person_kind, name, position_id, cost_center_id, active')
    .eq('company_id', companyId)
    .eq('id', personId)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;

  return {
    id: data.id as string,
    kind: data.person_kind === 'driver' ? 'driver' : 'employee',
    name: data.name as string,
    positionId: (data.position_id as string | null) ?? null,
    costCenterId: (data.cost_center_id as string | null) ?? null,
    active: Boolean(data.active),
  };
}
