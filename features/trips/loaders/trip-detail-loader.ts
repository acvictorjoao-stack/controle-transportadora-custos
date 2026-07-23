import type {SupabaseClient} from '@supabase/supabase-js';

import {
  getTripById,
  listTripDocuments,
  listTripExpenses,
  listTripHistory,
  listTripLocations,
  listTripOccurrences,
  listTripStops,
  getTripChecklist,
} from '../queries/trips';
import type {Trip, TripDetailData} from '../types';
import {
  emptyTripIntegrationSections,
  type TripIntegrationSections,
} from '../types/integrations';

export type TripDetailSectionLoader = (
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
) => Promise<Partial<TripIntegrationSections>>;

/** Registry for future module loaders (financeiro, abastecimentos, etc.). */
const integrationLoaders: TripDetailSectionLoader[] = [];

export function registerTripDetailLoader(loader: TripDetailSectionLoader): void {
  integrationLoaders.push(loader);
}

async function loadIntegrationSections(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripIntegrationSections> {
  const base = emptyTripIntegrationSections();

  if (integrationLoaders.length === 0) {
    return base;
  }

  // Cada loader de integração é isolado: uma falha em um módulo (ex.: financeiro)
  // não deve impedir a exibição da viagem nem as demais seções já carregadas.
  const results = await Promise.all(
    integrationLoaders.map(async (loader) => {
      try {
        return await loader(supabase, companyId, tripId);
      } catch (error) {
        console.error('Falha ao carregar integração do detalhe da viagem:', error);
        return {};
      }
    }),
  );

  return results.reduce<TripIntegrationSections>(
    (acc, section) => ({
      financial: section.financial ?? acc.financial,
      fuelRecords: section.fuelRecords ?? acc.fuelRecords,
      tires: section.tires ?? acc.tires,
      maintenances: section.maintenances ?? acc.maintenances,
      bi: section.bi ?? acc.bi,
      telemetry: section.telemetry ?? acc.telemetry,
      driverApp: section.driverApp ?? acc.driverApp,
      ai: section.ai ?? acc.ai,
    }),
    base,
  );
}

function buildTimeline(trip: Trip, history: TripDetailData['history']) {
  return history.map((entry) => ({
    id: entry.id,
    action: entry.action,
    createdAt: entry.createdAt,
    changes: entry.changes,
  }));
}

/**
 * Isolates a core detail section so one failing query cannot blank the whole
 * trip page. Returns `fallback` and logs the error when the loader throws.
 */
async function loadSectionSafe<T>(
  label: string,
  loader: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.error(`Falha ao carregar seção "${label}" do detalhe da viagem:`, error);
    return fallback;
  }
}

export async function composeTripDetail(
  supabase: SupabaseClient,
  companyId: string,
  tripId: string,
): Promise<TripDetailData | null> {
  const trip = await getTripById(supabase, companyId, tripId);
  if (!trip) return null;

  const [
    history,
    documents,
    checklist,
    stops,
    occurrences,
    expenses,
    locations,
    integrations,
  ] = await Promise.all([
    loadSectionSafe('history', () => listTripHistory(supabase, companyId, tripId), []),
    loadSectionSafe('documents', () => listTripDocuments(supabase, companyId, tripId), []),
    loadSectionSafe('checklist', () => getTripChecklist(supabase, companyId, tripId), null),
    loadSectionSafe('stops', () => listTripStops(supabase, companyId, tripId), []),
    loadSectionSafe(
      'occurrences',
      () => listTripOccurrences(supabase, companyId, tripId),
      [],
    ),
    loadSectionSafe('expenses', () => listTripExpenses(supabase, companyId, tripId), []),
    loadSectionSafe('locations', () => listTripLocations(supabase, companyId, tripId), []),
    loadIntegrationSections(supabase, companyId, tripId),
  ]);

  return {
    trip,
    history,
    documents,
    checklist,
    stops,
    occurrences,
    expenses,
    locations,
    timeline: buildTimeline(trip, history),
    ...integrations,
  };
}
