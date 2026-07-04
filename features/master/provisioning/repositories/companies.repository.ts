import type {SupabaseClient} from '@supabase/supabase-js';

import {COMPANY_DETAIL_COLUMNS} from '@/features/master/companies/constants';
import {mapCompanyRow} from '@/features/master/companies/services/mappers';
import type {Company, CompanyRow} from '@/features/master/companies/types';
import {mapDatabaseError} from '@/features/master/companies/utils/database-error';
import type {ProvisionStatus} from '../types';

export async function insertCompanyForProvisioning(
  supabase: SupabaseClient,
  input: {
    legalName: string;
    tradeName?: string;
    taxId: string;
    email: string;
    phone?: string;
    slug: string;
    planSlug?: string;
  },
): Promise<Company> {
  const planSlug = input.planSlug?.trim() || 'free';
  const now = new Date().toISOString();

  const {data, error} = await supabase
    .from('companies')
    .insert({
      legal_name: input.legalName,
      trade_name: input.tradeName?.trim() || null,
      tax_id: input.taxId,
      slug: input.slug,
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      provision_status: 'in_progress',
      settings: {
        plan_slug: planSlug,
        provision_history: [
          {at: now, status: 'in_progress', message: 'Empresa criada'},
        ],
      },
    })
    .select(COMPANY_DETAIL_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCompanyRow({
    ...(data as CompanyRow),
    settings:
      typeof data.settings === 'object' && data.settings !== null
        ? (data.settings as Record<string, unknown>)
        : {},
  });
}

export async function updateProvisionStatus(
  supabase: SupabaseClient,
  companyId: string,
  status: ProvisionStatus,
  errorMessage?: string | null,
): Promise<void> {
  const {error} = await supabase.rpc('update_company_provision_status', {
    p_company_id: companyId,
    p_status: status,
    p_error: errorMessage ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}
