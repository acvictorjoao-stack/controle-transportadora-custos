import type {SupabaseClient} from '@supabase/supabase-js';

import type {SharedAnalyticsFilters} from '@/features/analytics-nav';
import {
  listCompanyTripOccurrences,
  listTrips,
} from '@/features/trips/queries';
import type {TripListFilters} from '@/features/trips/types';

import type {OperationalIntelligenceData} from '../types';
import {composeOperationalIntelligence} from '../utils/compose';

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

/** Opções do loader — espelha filtros compartilhados (centro é ignorado). */
export type OperationalIntelligenceLoaderOptions = SharedAnalyticsFilters;

function hasExplicitPeriod(options: OperationalIntelligenceLoaderOptions): boolean {
  return Boolean(options.dateFrom) || Boolean(options.dateTo);
}

/** Qualquer recorte (período ou dimensão) restringe ocorrências às trips elegíveis. */
function needsOccurrenceTripScope(
  options: OperationalIntelligenceLoaderOptions,
): boolean {
  return (
    hasExplicitPeriod(options) ||
    Boolean(
      options.branchId ||
        options.customerId ||
        options.routeId ||
        options.vehicleId ||
        options.driverId,
    )
  );
}

function buildTripListFilters(
  options: OperationalIntelligenceLoaderOptions,
  explicitPeriod: boolean,
): TripListFilters | undefined {
  const filters: TripListFilters = {};

  if (options.branchId) filters.branchId = options.branchId;
  if (options.customerId) filters.customerId = options.customerId;
  if (options.routeId) filters.routeId = options.routeId;
  if (options.vehicleId) filters.vehicleId = options.vehicleId;
  if (options.driverId) filters.driverId = options.driverId;
  if (explicitPeriod) {
    if (options.dateFrom) filters.dateFrom = options.dateFrom;
    if (options.dateTo) filters.dateTo = options.dateTo;
  }

  return Object.keys(filters).length > 0 ? filters : undefined;
}

/**
 * Loader da Inteligência Operacional.
 * Reutiliza `listTrips` + `listCompanyTripOccurrences` e compõe analytics
 * em memória (sem DRE/financeiro/rateio).
 *
 * Sem período: últimas 500 viagens + ocorrências recentes (14 dias).
 * Com período: `departed_at` / `occurred_at` no mesmo intervalo.
 * Dimensões (filial, cliente, rota, veículo, motorista) são AND.
 * `costCenterId` não se aplica e é ignorado.
 */
export async function getOperationalIntelligenceData(
  supabase: SupabaseClient,
  companyId: string,
  options: OperationalIntelligenceLoaderOptions = {},
): Promise<OperationalIntelligenceData> {
  const explicitPeriod = hasExplicitPeriod(options);
  const tripFilters = buildTripListFilters(options, explicitPeriod);

  const tripsPage = await listTrips(supabase, {
    companyId,
    page: 1,
    pageSize: 500,
    sort: {
      sortBy: explicitPeriod ? 'departed_at' : 'created_at',
      sortOrder: 'desc',
    },
    filters: tripFilters,
  });

  const tripIds = tripsPage.items.map((trip) => trip.id);
  const occurrenceDateFrom = explicitPeriod
    ? options.dateFrom
    : daysAgoIso(14);
  const occurrenceDateTo = explicitPeriod ? options.dateTo : undefined;

  const occurrences = await listCompanyTripOccurrences(supabase, companyId, {
    dateFrom: occurrenceDateFrom,
    dateTo: occurrenceDateTo,
    branchId: options.branchId,
    tripIds: needsOccurrenceTripScope(options) ? tripIds : undefined,
    limit: 500,
  });

  return composeOperationalIntelligence({
    trips: tripsPage.items,
    occurrences,
    hasExplicitPeriod: explicitPeriod,
    period:
      explicitPeriod
        ? {dateFrom: options.dateFrom, dateTo: options.dateTo}
        : undefined,
  });
}
