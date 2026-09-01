import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import type {EntityStatus} from '@/features/organization/companies/types';

import {POSITION_LIST_COLUMNS, POSITIONS_PAGE_SIZE} from '../constants';
import {mapPositionRow} from '../services/mappers';
import type {PaginatedPositions, Position, PositionRow} from '../types';
import type {CreatePositionInput, UpdatePositionInput} from '../validation';

const defaultsPromiseByCompany = new Map<string, Promise<void>>();

export async function ensurePositionDefaults(
  supabase: SupabaseClient,
  companyId: string,
): Promise<void> {
  let pending = defaultsPromiseByCompany.get(companyId);
  if (!pending) {
    pending = (async () => {
      const {error} = await supabase.rpc('seed_positions_for_company', {
        p_company_id: companyId,
        p_created_by: null,
      });
      // Semear exige financeiro:create. Quem só lê a folha segue com os cargos
      // já existentes em vez de receber erro ao abrir a tela.
      if (error && error.code !== '42501') {
        throw new Error(mapDatabaseError(error));
      }
    })().finally(() => {
      defaultsPromiseByCompany.delete(companyId);
    });
    defaultsPromiseByCompany.set(companyId, pending);
  }
  await pending;
}

export async function listPositions(
  supabase: SupabaseClient,
  companyId: string,
  options: {activeOnly?: boolean} = {},
): Promise<Position[]> {
  await ensurePositionDefaults(supabase, companyId);

  let query = supabase
    .from('positions')
    .select(POSITION_LIST_COLUMNS)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .order('is_system', {ascending: false})
    .order('name', {ascending: true});

  if (options.activeOnly !== false) {
    query = query.eq('status', 'active');
  }

  const {data, error} = await query;

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return (data ?? []).map((row) => mapPositionRow(row as unknown as PositionRow));
}

export interface ListPositionsOptions {
  companyId: string;
  search?: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}

export async function listPositionsPaginated(
  supabase: SupabaseClient,
  options: ListPositionsOptions,
): Promise<PaginatedPositions> {
  await ensurePositionDefaults(supabase, options.companyId);

  const search = options.search?.trim() ?? '';
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? POSITIONS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('positions')
    .select(POSITION_LIST_COLUMNS, {count: 'exact'})
    .eq('company_id', options.companyId)
    .is('deleted_at', null)
    .order('is_system', {ascending: false})
    .order('name', {ascending: true});

  if (options.activeOnly) {
    query = query.eq('status', 'active');
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,description.ilike.%${search}%`);
  }

  const {data, error, count} = await query.range(from, to);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) => mapPositionRow(row as unknown as PositionRow)),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getPositionById(
  supabase: SupabaseClient,
  companyId: string,
  positionId: string,
): Promise<Position | null> {
  const {data, error} = await supabase
    .from('positions')
    .select(POSITION_LIST_COLUMNS)
    .eq('id', positionId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapPositionRow(data as unknown as PositionRow);
}

export async function createPosition(
  supabase: SupabaseClient,
  companyId: string,
  input: CreatePositionInput & {code: string},
  profileId: string,
): Promise<Position> {
  const {data, error} = await supabase
    .from('positions')
    .insert({
      company_id: companyId,
      code: input.code,
      name: input.name,
      description: input.description,
      status: input.status ?? 'active',
      is_system: false,
      created_by: profileId,
      updated_by: profileId,
    })
    .select(POSITION_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapPositionRow(data as unknown as PositionRow);
}

export async function updatePosition(
  supabase: SupabaseClient,
  companyId: string,
  positionId: string,
  input: UpdatePositionInput & {code: string},
  profileId: string,
): Promise<Position> {
  const existing = await getPositionById(supabase, companyId, positionId);
  if (!existing) {
    throw new Error('Cargo não encontrado.');
  }

  const payload: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    status: input.status,
    updated_by: profileId,
  };

  // Cargos do sistema mantêm o código estável (ex.: MOTORISTA).
  if (!existing.isSystem) {
    payload.code = input.code;
  }

  const {data, error} = await supabase
    .from('positions')
    .update(payload)
    .eq('id', positionId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(POSITION_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapPositionRow(data as unknown as PositionRow);
}

export async function softDeletePosition(
  supabase: SupabaseClient,
  companyId: string,
  positionId: string,
  profileId: string,
): Promise<void> {
  const existing = await getPositionById(supabase, companyId, positionId);
  if (!existing) {
    throw new Error('Cargo não encontrado.');
  }

  if (existing.isSystem) {
    throw new Error('Cargos do sistema não podem ser excluídos.');
  }

  const {count, error: countError} = await supabase
    .from('payroll_expenses')
    .select('id', {count: 'exact', head: true})
    .eq('company_id', companyId)
    .eq('position_id', positionId)
    .is('deleted_at', null);

  if (countError) {
    throw new Error(mapDatabaseError(countError));
  }

  if ((count ?? 0) > 0) {
    throw new Error('Não é possível excluir: existem despesas vinculadas a este cargo.');
  }

  const {error} = await supabase
    .from('positions')
    .update({
      deleted_at: new Date().toISOString(),
      status: 'inactive',
      updated_by: profileId,
    })
    .eq('id', positionId)
    .eq('company_id', companyId)
    .is('deleted_at', null);

  if (error) {
    throw new Error(mapDatabaseError(error));
  }
}

export async function setPositionStatus(
  supabase: SupabaseClient,
  companyId: string,
  positionId: string,
  status: Extract<EntityStatus, 'active' | 'inactive'>,
  profileId: string,
): Promise<Position> {
  const {data, error} = await supabase
    .from('positions')
    .update({status, updated_by: profileId})
    .eq('id', positionId)
    .eq('company_id', companyId)
    .is('deleted_at', null)
    .select(POSITION_LIST_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapPositionRow(data as unknown as PositionRow);
}
