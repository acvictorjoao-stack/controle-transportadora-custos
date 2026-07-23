import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import type {EntityStatus} from '@/features/organization/companies/types';

import {COST_CENTER_LIST_COLUMNS, COST_CENTERS_PAGE_SIZE} from '../constants';
import {mapCostCenterRow} from '../services/mappers';
import type {
  CostCenter,
  CostCenterRow,
  CostCenterSelectOption,
  PaginatedCostCenters,
} from '../types';
import type {CreateCostCenterInput, UpdateCostCenterInput} from '../validation';

export interface ListCostCentersOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  status?: string;
  /** When true, only status = active. */
  activeOnly?: boolean;
}

let defaultsPromiseByCompany = new Map<string, Promise<void>>();

export async function ensureCostCenterDefaults(
  supabase: SupabaseClient,
  companyId: string,
): Promise<void> {
  let pending = defaultsPromiseByCompany.get(companyId);
  if (!pending) {
    pending = (async () => {
      const {error} = await supabase.rpc('seed_cost_centers_for_company', {
        p_company_id: companyId,
        p_created_by: null,
      });
      if (error) {
        throw new Error(mapDatabaseError(error));
      }
    })().finally(() => {
      defaultsPromiseByCompany.delete(companyId);
    });
    defaultsPromiseByCompany.set(companyId, pending);
  }
  await pending;
}

export async function listCostCenters(
  supabase: SupabaseClient,
  options: ListCostCentersOptions,
): Promise<PaginatedCostCenters> {
  await ensureCostCenterDefaults(supabase, options.companyId);

  const search = options.search?.trim() ?? '';
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? COST_CENTERS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('cost_centers')
    .select(COST_CENTER_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null)
    .order('is_system', {ascending: false})
    .order('code', {ascending: true});

  if (options.activeOnly) {
    query = query.eq('status', 'active');
  } else if (options.status) {
    query = query.eq('status', options.status);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`,
    );
  }

  const {data, error, count} = await query.range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;
  const items = (data ?? []).map((row) => mapCostCenterRow(row as CostCenterRow));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listCostCentersForSelect(
  supabase: SupabaseClient,
  companyId: string,
  limit = 100,
): Promise<CostCenterSelectOption[]> {
  await ensureCostCenterDefaults(supabase, companyId);

  const {data, error} = await supabase
    .from('cost_centers')
    .select('id, code, name, status')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .order('is_system', {ascending: false})
    .order('code', {ascending: true})
    .limit(limit);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    code: row.code as string,
    name: row.name as string,
    active: row.status === 'active',
  }));
}

export async function getCostCenterById(
  supabase: SupabaseClient,
  companyId: string,
  costCenterId: string,
): Promise<CostCenter | null> {
  const {data, error} = await supabase
    .from('cost_centers')
    .select(COST_CENTER_LIST_COLUMNS)
    .eq('id', costCenterId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapCostCenterRow(data as CostCenterRow);
}

export async function getCostCenterByCode(
  supabase: SupabaseClient,
  companyId: string,
  code: string,
): Promise<CostCenter | null> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;

  const {data, error} = await supabase
    .from('cost_centers')
    .select(COST_CENTER_LIST_COLUMNS)
    .eq('company_id', companyId)
    .ilike('code', normalized)
    .eq('status', 'active')
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapCostCenterRow(data as CostCenterRow);
}

export async function createCostCenter(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateCostCenterInput,
  profileId: string,
): Promise<CostCenter> {
  const {data, error} = await supabase
    .from('cost_centers')
    .insert({
      company_id: companyId,
      code: input.code,
      name: input.name,
      description: input.description,
      is_system: false,
      created_by: profileId,
      updated_by: profileId,
    })
    .select(COST_CENTER_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCostCenterRow(data as CostCenterRow);
}

export async function updateCostCenter(
  supabase: SupabaseClient,
  companyId: string,
  costCenterId: string,
  input: UpdateCostCenterInput,
  profileId: string,
): Promise<CostCenter> {
  const existing = await getCostCenterById(supabase, companyId, costCenterId);
  if (!existing) {
    throw new Error('Centro de custo não encontrado.');
  }

  const payload: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    updated_by: profileId,
  };

  // System centers keep their seeded code stable for resolveCostCenter().
  if (!existing.isSystem) {
    payload.code = input.code;
  }

  const {data, error} = await supabase
    .from('cost_centers')
    .update(payload)
    .eq('id', costCenterId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(COST_CENTER_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCostCenterRow(data as CostCenterRow);
}

export async function setCostCenterStatus(
  supabase: SupabaseClient,
  companyId: string,
  costCenterId: string,
  status: EntityStatus,
  profileId: string,
): Promise<CostCenter> {
  const {data, error} = await supabase
    .from('cost_centers')
    .update({
      status,
      updated_by: profileId,
    })
    .eq('id', costCenterId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(COST_CENTER_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCostCenterRow(data as CostCenterRow);
}

export async function countCostCenterLinkedEntries(
  supabase: SupabaseClient,
  companyId: string,
  costCenterId: string,
): Promise<number> {
  const {count, error} = await supabase
    .from('financial_entries')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .eq('cost_center_id', costCenterId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return count ?? 0;
}

/**
 * Soft-delete when there are no linked ledger entries.
 * System centers may be inactivated, but not deleted.
 */
export async function softDeleteCostCenter(
  supabase: SupabaseClient,
  companyId: string,
  costCenterId: string,
  profileId: string,
): Promise<void> {
  const existing = await getCostCenterById(supabase, companyId, costCenterId);
  if (!existing) {
    throw new Error('Centro de custo não encontrado.');
  }

  if (existing.isSystem) {
    throw new Error('Centros de custo do sistema não podem ser excluídos.');
  }

  const linked = await countCostCenterLinkedEntries(
    supabase,
    companyId,
    costCenterId,
  );
  if (linked > 0) {
    throw new Error(
      'Não é possível excluir: existem lançamentos vinculados a este centro de custo.',
    );
  }

  const {error} = await supabase
    .from('cost_centers')
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: profileId,
      status: 'inactive',
    })
    .eq('id', costCenterId)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}
