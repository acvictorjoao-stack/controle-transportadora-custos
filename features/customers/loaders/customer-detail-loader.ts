import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getCustomerById,
  listCustomerAddresses,
  listCustomerContacts,
  listCustomerContracts,
  listCustomerDocuments,
  listCustomerHistory,
} from '../queries/customers';
import type {Customer, CustomerDetailData} from '../types';
import {
  emptyCustomerIntegrationSections,
  type CustomerIntegrationSections,
} from '../types/integrations';

export type CustomerDetailSectionLoader = (
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
) => Promise<Partial<CustomerIntegrationSections>>;

const integrationLoaders: CustomerDetailSectionLoader[] = [];

export function registerCustomerDetailLoader(loader: CustomerDetailSectionLoader): void {
  integrationLoaders.push(loader);
}

async function loadIntegrationSections(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<CustomerIntegrationSections> {
  const base = emptyCustomerIntegrationSections();

  if (integrationLoaders.length === 0) return base;

  const results = await Promise.all(
    integrationLoaders.map((loader) => loader(supabase, companyId, customerId)),
  );

  return results.reduce<CustomerIntegrationSections>(
    (acc, section) => ({
      trips: section.trips ?? acc.trips,
      financial: section.financial ?? acc.financial,
      extensions: {...acc.extensions, ...(section.extensions ?? {})},
    }),
    base,
  );
}

export async function composeCustomerDetail(
  supabase: SupabaseClient,
  companyId: string,
  customerId: string,
): Promise<CustomerDetailData | null> {
  const customer = await getCustomerById(supabase, companyId, customerId);
  if (!customer) return null;

  const [addresses, contacts, contracts, documents, history, integrations] = await Promise.all([
    listCustomerAddresses(supabase, companyId, customerId),
    listCustomerContacts(supabase, companyId, customerId),
    listCustomerContracts(supabase, companyId, customerId),
    listCustomerDocuments(supabase, companyId, customerId),
    listCustomerHistory(supabase, companyId, customerId),
    loadIntegrationSections(supabase, companyId, customerId),
  ]);

  return {
    customer,
    addresses,
    contacts,
    contracts,
    documents,
    history,
    ...integrations,
  };
}

export type {Customer};
