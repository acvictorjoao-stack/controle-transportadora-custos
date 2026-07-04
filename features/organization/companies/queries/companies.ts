import type {SupabaseClient} from '@supabase/supabase-js';

import {mapDatabaseError} from '@/features/master/companies/utils/database-error';

import {COMPANY_PROFILE_COLUMNS} from '../constants';
import {mapCompanyProfileRow} from '../services/mappers';
import {
  mergeCompanySettings,
} from '../../settings/services/settings-mapper';
import type {CompanySettings} from '../../settings/types';
import type {CompanyProfile, CompanyProfileRow} from '../types';
import type {CompanySettingsInput, UpdateCompanyProfileInput} from '../validation';

export async function getCompanyProfileById(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyProfile | null> {
  const {data, error} = await supabase
    .from('companies')
    .select(COMPANY_PROFILE_COLUMNS)
    .eq('id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  if (!data) return null;
  return mapCompanyProfileRow(data as CompanyProfileRow);
}

export async function getCurrentCompanyProfile(
  supabase: SupabaseClient,
  companyId: string,
): Promise<CompanyProfile | null> {
  return getCompanyProfileById(supabase, companyId);
}

export async function updateCompanyProfile(
  supabase: SupabaseClient,
  companyId: string,
  input: UpdateCompanyProfileInput,
): Promise<CompanyProfile> {
  const {data, error} = await supabase
    .from('companies')
    .update({
      legal_name: input.legalName,
      trade_name: input.tradeName ?? null,
      tax_id: input.taxId,
      email: input.email,
      phone: input.phone,
      whatsapp: input.whatsapp,
      website: input.website,
      state_registration: input.stateRegistration,
      municipal_registration: input.municipalRegistration,
      address_street: input.addressStreet,
      address_number: input.addressNumber,
      address_complement: input.addressComplement,
      address_neighborhood: input.addressNeighborhood,
      address_city: input.addressCity,
      address_state: input.addressState,
      address_zip: input.addressZip,
      address_country: input.addressCountry,
    })
    .eq('id', companyId)
    .is('deleted_at', null)
    .select(COMPANY_PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCompanyProfileRow(data as CompanyProfileRow);
}

export async function updateCompanySettings(
  supabase: SupabaseClient,
  companyId: string,
  input: CompanySettingsInput,
  existingSettings: Record<string, unknown>,
): Promise<CompanyProfile> {
  const merged = mergeCompanySettings(existingSettings, input);

  const {data, error} = await supabase
    .from('companies')
    .update({settings: merged})
    .eq('id', companyId)
    .is('deleted_at', null)
    .select(COMPANY_PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCompanyProfileRow(data as CompanyProfileRow);
}

export async function updateCompanyLogoUrl(
  supabase: SupabaseClient,
  companyId: string,
  logoUrl: string | null,
): Promise<CompanyProfile> {
  const {data, error} = await supabase
    .from('companies')
    .update({logo_url: logoUrl})
    .eq('id', companyId)
    .is('deleted_at', null)
    .select(COMPANY_PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCompanyProfileRow(data as CompanyProfileRow);
}

export async function completeOnboarding(
  supabase: SupabaseClient,
  companyId: string,
  existingSettings: Record<string, unknown>,
): Promise<CompanyProfile> {
  const merged = mergeCompanySettings(existingSettings, {onboardingCompleted: true});

  const {data, error} = await supabase
    .from('companies')
    .update({settings: merged})
    .eq('id', companyId)
    .is('deleted_at', null)
    .select(COMPANY_PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  return mapCompanyProfileRow(data as CompanyProfileRow);
}

export async function getCompanyRawSettings(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Record<string, unknown>> {
  const {data, error} = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error(mapDatabaseError(error));
  }

  const settings = data?.settings;
  return settings && typeof settings === 'object'
    ? (settings as Record<string, unknown>)
    : {};
}

export function isCompanyProfileComplete(profile: CompanyProfile): boolean {
  return Boolean(
    profile.legalName.trim() &&
      profile.taxId.trim() &&
      profile.email.trim() &&
      profile.addressStreet?.trim() &&
      profile.addressCity?.trim() &&
      profile.addressState?.trim() &&
      profile.addressZip?.trim(),
  );
}

export function needsOnboarding(profile: CompanyProfile): boolean {
  if (profile.settings.onboardingCompleted) return false;
  return !isCompanyProfileComplete(profile);
}
