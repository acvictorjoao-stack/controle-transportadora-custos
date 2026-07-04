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

  const results = await Promise.all(
    integrationLoaders.map((loader) => loader(supabase, companyId, tripId)),
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
    listTripHistory(supabase, companyId, tripId),
    listTripDocuments(supabase, companyId, tripId),
    getTripChecklist(supabase, companyId, tripId),
    listTripStops(supabase, companyId, tripId),
    listTripOccurrences(supabase, companyId, tripId),
    listTripExpenses(supabase, companyId, tripId),
    listTripLocations(supabase, companyId, tripId),
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
