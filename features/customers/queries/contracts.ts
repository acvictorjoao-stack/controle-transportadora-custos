import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {mapCustomerContractItemRow, mapCustomerContractRow} from '../services/mappers';
import type {CustomerContract, CustomerContractItemRow, CustomerContractRow} from '../types/customer';
import type {CreateCustomerContractInput, UpdateCustomerContractInput} from '../validation';

function buildContractPayload(
  input: CreateCustomerContractInput | UpdateCustomerContractInput,
  profileId: string,
  isCreate: boolean,
  customerId?: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    contract_number: input.contractNumber,
    contract_status: input.contractStatus ?? 'draft',
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    contract_type: input.contractType ?? 'spot',
    freight_table: input.freightTable,
    currency: input.currency ?? 'BRL',
    notes: input.notes,
    readjustment_index: input.readjustmentIndex ?? 'none',
    readjustment_notes: input.readjustmentNotes,
    updated_by: profileId,
  };

  if (isCreate && customerId) {
    payload.customer_id = customerId;
    payload.created_by = profileId;
  }

  return payload;
}

export async function createCustomerContract(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateCustomerContractInput,
  profileId: string,
): Promise<CustomerContract> {
  const {data, error} = await supabase
    .from('customer_contracts')
    .insert({
      company_id: companyId,
      ...buildContractPayload(input, profileId, true, input.customerId),
    })
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));

  const contract = mapCustomerContractRow(data as CustomerContractRow);

  if (input.items && input.items.length > 0) {
    const itemRows = input.items.map((item) => ({
      company_id: companyId,
      contract_id: contract.id,
      origin: item.origin,
      destination: item.destination,
      freight_value: item.freightValue,
      minimum_value: item.minimumValue,
      weight_kg: item.weightKg,
      volume_m3: item.volumeM3,
      toll_included: item.tollIncluded ?? false,
      gris_percent: item.grisPercent,
      insurance_percent: item.insurancePercent,
      additional_value: item.additionalValue,
      delivery_days: item.deliveryDays,
      created_by: profileId,
      updated_by: profileId,
    }));

    const {data: items, error: itemsError} = await supabase
      .from('customer_contract_items')
      .insert(itemRows)
      .select('*');

    if (itemsError) throw new Error(mapDatabaseError(itemsError));
    contract.items = (items as CustomerContractItemRow[]).map(mapCustomerContractItemRow);
  } else {
    contract.items = [];
  }

  return contract;
}

export async function updateCustomerContract(
  supabase: SupabaseClient,
  companyId: string,
  contractId: string,
  input: UpdateCustomerContractInput,
  profileId: string,
): Promise<CustomerContract> {
  const {data, error} = await supabase
    .from('customer_contracts')
    .update(buildContractPayload(input, profileId, false))
    .eq('company_id', companyId)
    .eq('id', contractId)
    .is('deleted_at', null)
    .select('*')
    .single();

  if (error) throw new Error(mapDatabaseError(error));
  const contract = mapCustomerContractRow(data as CustomerContractRow);

  if (input.items) {
    await supabase
      .from('customer_contract_items')
      .update({deleted_at: new Date().toISOString(), updated_by: profileId})
      .eq('company_id', companyId)
      .eq('contract_id', contractId)
      .is('deleted_at', null);

    if (input.items.length > 0) {
      const itemRows = input.items.map((item) => ({
        company_id: companyId,
        contract_id: contractId,
        origin: item.origin,
        destination: item.destination,
        freight_value: item.freightValue,
        minimum_value: item.minimumValue,
        weight_kg: item.weightKg,
        volume_m3: item.volumeM3,
        toll_included: item.tollIncluded ?? false,
        gris_percent: item.grisPercent,
        insurance_percent: item.insurancePercent,
        additional_value: item.additionalValue,
        delivery_days: item.deliveryDays,
        created_by: profileId,
        updated_by: profileId,
      }));

      const {data: items, error: itemsError} = await supabase
        .from('customer_contract_items')
        .insert(itemRows)
        .select('*');

      if (itemsError) throw new Error(mapDatabaseError(itemsError));
      contract.items = (items as CustomerContractItemRow[]).map(mapCustomerContractItemRow);
    } else {
      contract.items = [];
    }
  }

  return contract;
}

export async function softDeleteCustomerContract(
  supabase: SupabaseClient,
  companyId: string,
  contractId: string,
  profileId: string,
): Promise<void> {
  const {error} = await supabase
    .from('customer_contracts')
    .update({
      deleted_at: new Date().toISOString(),
      contract_status: 'cancelled',
      updated_by: profileId,
    })
    .eq('company_id', companyId)
    .eq('id', contractId)
    .is('deleted_at', null);

  if (error) throw new Error(mapDatabaseError(error));
}

export interface ContractFreightDefaults {
  origin: string | null;
  destination: string | null;
  freightValue: number | null;
  minimumValue: number | null;
  freightTable: string | null;
  deliveryDays: number | null;
  tollIncluded: boolean;
  grisPercent: number | null;
  insurancePercent: number | null;
  additionalValue: number | null;
  notes: string | null;
  currency: string;
}

export async function resolveContractFreightDefaults(
  supabase: SupabaseClient,
  companyId: string,
  contractId: string,
  origin?: string | null,
  destination?: string | null,
): Promise<ContractFreightDefaults | null> {
  const contract = await supabase
    .from('customer_contracts')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', contractId)
    .is('deleted_at', null)
    .maybeSingle();

  if (contract.error || !contract.data) return null;

  const row = contract.data as CustomerContractRow;
  let itemQuery = supabase
    .from('customer_contract_items')
    .select('*')
    .eq('company_id', companyId)
    .eq('contract_id', contractId)
    .is('deleted_at', null);

  if (origin) itemQuery = itemQuery.ilike('origin', origin);
  if (destination) itemQuery = itemQuery.ilike('destination', destination);

  const {data: items} = await itemQuery.limit(1);
  const item = (items?.[0] ?? null) as CustomerContractItemRow | null;

  return {
    origin: item?.origin ?? origin ?? null,
    destination: item?.destination ?? destination ?? null,
    freightValue: item?.freight_value !== null && item?.freight_value !== undefined
      ? Number(item.freight_value)
      : null,
    minimumValue: item?.minimum_value !== null && item?.minimum_value !== undefined
      ? Number(item.minimum_value)
      : null,
    freightTable: row.freight_table,
    deliveryDays: item?.delivery_days ?? null,
    tollIncluded: item?.toll_included ?? false,
    grisPercent: item?.gris_percent != null ? Number(item.gris_percent) : null,
    insurancePercent: item?.insurance_percent != null ? Number(item.insurance_percent) : null,
    additionalValue: item?.additional_value != null ? Number(item.additional_value) : null,
    notes: row.notes,
    currency: row.currency,
  };
}
