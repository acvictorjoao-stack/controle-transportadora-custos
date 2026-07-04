import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {BRANCH_LIST_COLUMNS, BRANCHES_PAGE_SIZE} from '../constants';
import {mapBranchRow} from '../services/mappers';
import type {Branch, BranchRow, BranchSelectOption, PaginatedBranches} from '../types';
import type {CreateBranchInput, UpdateBranchInput} from '../validation';

export interface ListBranchesOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
}

export async function listBranches(
  supabase: SupabaseClient,
  options: ListBranchesOptions,
): Promise<PaginatedBranches> {
  const search = options.search?.trim() ?? '';
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? BRANCHES_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('branches')
    .select(BRANCH_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null)
    .order('is_headquarters', {ascending: false})
    .order('name', {ascending: true});

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,code.ilike.%${search}%,tax_id.ilike.%${search}%`,
    );
  }

  const {data, error, count} = await query.range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;
  const items = (data ?? []).map((row) => mapBranchRow(row as BranchRow));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listBranchesForSelect(
  supabase: SupabaseClient,
  companyId: string,
  limit = 100,
): Promise<BranchSelectOption[]> {
  const {data, error} = await supabase
    .from('branches')
    .select('id, name, code')
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('is_headquarters', {ascending: false})
    .order('name', {ascending: true})
    .limit(limit);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
  }));
}

export async function getBranchById(
  supabase: SupabaseClient,
  companyId: string,
  branchId: string,
): Promise<Branch | null> {
  const {data, error} = await supabase
    .from('branches')
    .select(BRANCH_LIST_COLUMNS)
    .eq('id', branchId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapBranchRow(data as BranchRow);
}

export async function createBranch(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateBranchInput,
  profileId: string,
): Promise<Branch> {
  const {data, error} = await supabase
    .from('branches')
    .insert({
      company_id: companyId,
      code: input.code.toUpperCase(),
      name: input.name,
      tax_id: input.taxId,
      address_street: input.addressStreet,
      phone: input.phone,
      responsible_name: input.responsibleName,
      is_headquarters: input.isHeadquarters ?? false,
      created_by: profileId,
      updated_by: profileId,
    })
    .select(BRANCH_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapBranchRow(data as BranchRow);
}

export async function updateBranch(
  supabase: SupabaseClient,
  companyId: string,
  branchId: string,
  input: UpdateBranchInput,
  profileId: string,
): Promise<Branch> {
  const payload: Record<string, unknown> = {
    code: input.code.toUpperCase(),
    name: input.name,
    tax_id: input.taxId,
    address_street: input.addressStreet,
    phone: input.phone,
    responsible_name: input.responsibleName,
    updated_by: profileId,
  };

  if (input.isHeadquarters !== undefined) {
    payload.is_headquarters = input.isHeadquarters;
  }
  if (input.status !== undefined) {
    payload.status = input.status;
  }

  const {data, error} = await supabase
    .from('branches')
    .update(payload)
    .eq('id', branchId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(BRANCH_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapBranchRow(data as BranchRow);
}

export async function softDeleteBranch(
  supabase: SupabaseClient,
  companyId: string,
  branchId: string,
  profileId: string,
): Promise<void> {
  const branch = await getBranchById(supabase, companyId, branchId);
  if (!branch) {
    throw new Error('Filial não encontrada.');
  }
  if (branch.isHeadquarters) {
    throw new Error('Não é possível excluir a filial matriz.');
  }

  const {error} = await supabase
    .from('branches')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'archived',
      updated_by: profileId,
    })
    .eq('id', branchId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function setBranchStatus(
  supabase: SupabaseClient,
  companyId: string,
  branchId: string,
  status: 'active' | 'inactive',
  profileId: string,
): Promise<Branch> {
  const {data, error} = await supabase
    .from('branches')
    .update({status, updated_by: profileId})
    .eq('id', branchId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(BRANCH_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapBranchRow(data as BranchRow);
}

export async function setHeadquarters(
  supabase: SupabaseClient,
  companyId: string,
  branchId: string,
  profileId: string,
): Promise<Branch> {
  const {data, error} = await supabase
    .from('branches')
    .update({is_headquarters: true, updated_by: profileId})
    .eq('id', branchId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(BRANCH_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapBranchRow(data as BranchRow);
}

export async function countActiveBranches(
  supabase: SupabaseClient,
  companyId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from('branches')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return count ?? 0;
}
