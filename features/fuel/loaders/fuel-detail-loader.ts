import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getFuelRecordDetailRow,
  listFuelDocuments,
  listFuelHistory,
} from '../queries/fuel-records';
import type {FuelDetailData} from '../types';
import {
  emptyFuelIntegrationSections,
  type FuelIntegrationSections,
} from '../types/integrations';

export type FuelDetailSectionLoader = (
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
) => Promise<Partial<FuelIntegrationSections>>;

/** Registry for future module loaders (financeiro, BI, IA, telemetria, app motorista). */
const integrationLoaders: FuelDetailSectionLoader[] = [];

export function registerFuelDetailLoader(loader: FuelDetailSectionLoader): void {
  integrationLoaders.push(loader);
}

async function loadIntegrationSections(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
): Promise<FuelIntegrationSections> {
  const base = emptyFuelIntegrationSections();

  if (integrationLoaders.length === 0) {
    return base;
  }

  const results = await Promise.all(
    integrationLoaders.map((loader) => loader(supabase, companyId, fuelRecordId)),
  );

  return results.reduce<FuelIntegrationSections>(
    (acc, section) => ({
      financial: section.financial ?? acc.financial,
      bi: section.bi ?? acc.bi,
      telemetry: section.telemetry ?? acc.telemetry,
      driverApp: section.driverApp ?? acc.driverApp,
      ai: section.ai ?? acc.ai,
    }),
    base,
  );
}

export async function composeFuelDetail(
  supabase: SupabaseClient,
  companyId: string,
  fuelRecordId: string,
): Promise<FuelDetailData | null> {
  const detail = await getFuelRecordDetailRow(supabase, companyId, fuelRecordId);
  if (!detail) return null;

  const [history, documents, integrations] = await Promise.all([
    listFuelHistory(supabase, companyId, fuelRecordId),
    listFuelDocuments(supabase, companyId, fuelRecordId),
    loadIntegrationSections(supabase, companyId, fuelRecordId),
  ]);

  return {
    record: detail.record,
    linkedTrip: detail.linkedTrip,
    history,
    documents,
    ...integrations,
  };
}
