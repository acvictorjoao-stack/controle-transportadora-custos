import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getDriverById,
  listDriverDocuments,
  listDriverHistory,
} from '../queries/drivers';
import type {Driver, DriverDetailData} from '../types';
import {
  emptyDriverIntegrationSections,
  type DriverIntegrationSections,
} from '../types/integrations';

export type DriverDetailSectionLoader = (
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
) => Promise<Partial<DriverIntegrationSections>>;

/** Registry for future module loaders (viagens, veículos, financeiro, etc.). */
const integrationLoaders: DriverDetailSectionLoader[] = [];

export function registerDriverDetailLoader(loader: DriverDetailSectionLoader): void {
  integrationLoaders.push(loader);
}

async function loadIntegrationSections(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
): Promise<DriverIntegrationSections> {
  const base = emptyDriverIntegrationSections();

  if (integrationLoaders.length === 0) {
    return base;
  }

  // Cada loader de integração é isolado: uma falha em um módulo (ex.: financeiro)
  // não deve impedir a exibição do motorista nem as demais seções já carregadas.
  const results = await Promise.all(
    integrationLoaders.map(async (loader) => {
      try {
        return await loader(supabase, companyId, driverId);
      } catch (error) {
        console.error('Falha ao carregar integração do detalhe do motorista:', error);
        return {};
      }
    }),
  );

  return results.reduce<DriverIntegrationSections>(
    (acc, section) => ({
      vehicles: section.vehicles ?? acc.vehicles,
      trips: section.trips ?? acc.trips,
      fuelRecords: section.fuelRecords ?? acc.fuelRecords,
      costs: section.costs ?? acc.costs,
      infractions: section.infractions ?? acc.infractions,
      trainings: section.trainings ?? acc.trainings,
      vacations: section.vacations ?? acc.vacations,
      telemetry: section.telemetry ?? acc.telemetry,
    }),
    base,
  );
}

export async function composeDriverDetail(
  supabase: SupabaseClient,
  companyId: string,
  driverId: string,
): Promise<DriverDetailData | null> {
  const driver = await getDriverById(supabase, companyId, driverId);
  if (!driver) return null;

  const [history, documents, integrations] = await Promise.all([
    listDriverHistory(supabase, companyId, driverId),
    listDriverDocuments(supabase, companyId, driverId),
    loadIntegrationSections(supabase, companyId, driverId),
  ]);

  return {
    driver,
    history,
    documents,
    ...integrations,
  };
}

export type {Driver};
