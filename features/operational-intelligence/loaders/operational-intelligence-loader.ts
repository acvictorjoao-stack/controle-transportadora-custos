import type {SupabaseClient} from '@supabase/supabase-js';

import type {SharedAnalyticsFilters} from '@/features/analytics-nav';
import {
  listCompanyTripOccurrences,
  listTripsInOperationalWindow,
} from '@/features/trips/queries';

import type {OperationalIntelligenceData} from '../types';
import {resolveOperationalAnalysisWindow} from '../utils/analysis-window';
import {
  composeOperationalIntelligence,
  PENDING_DELIVERY_STATUSES,
} from '../utils/compose';

/** Opções do loader — espelha filtros compartilhados (centro é ignorado). */
export type OperationalIntelligenceLoaderOptions = SharedAnalyticsFilters;

/**
 * Loader da Inteligência Operacional.
 * Reutiliza `trips` + `trip_occurrences` e compõe analytics em memória
 * (sem DRE/financeiro/rateio).
 *
 * Janela analítica única (`resolveOperationalAnalysisWindow`) para as duas
 * fontes, com os mesmos bounds `[gte, lt)` no fuso de negócio:
 * viagens por `departed_at`, ocorrências por `occurred_at`.
 * - Com período (de/ate/periodo): intervalo da URL.
 * - Sem período (visão ao vivo): últimos `LIVE_ANALYSIS_WINDOW_DAYS` dias,
 *   mais as viagens ainda em aberto (estado atual da operação).
 * Ocorrências só entram se a viagem estiver no dataset.
 * Dimensões (filial, cliente, rota, veículo, motorista) são AND.
 * `costCenterId` não se aplica e é ignorado.
 */
export async function getOperationalIntelligenceData(
  supabase: SupabaseClient,
  companyId: string,
  options: OperationalIntelligenceLoaderOptions = {},
  now: Date = new Date(),
): Promise<OperationalIntelligenceData> {
  const window = resolveOperationalAnalysisWindow(options, now);
  const bounds = {gte: window.gte, lt: window.lt};

  const trips = await listTripsInOperationalWindow(supabase, companyId, {
    departedAt: bounds,
    openStatuses: window.explicit ? undefined : PENDING_DELIVERY_STATUSES,
    branchId: options.branchId,
    customerId: options.customerId,
    routeId: options.routeId,
    vehicleId: options.vehicleId,
    driverId: options.driverId,
  });

  const occurrences = await listCompanyTripOccurrences(supabase, companyId, {
    occurredAt: bounds,
    branchId: options.branchId,
    tripIds: trips.map((trip) => trip.id),
  });

  return composeOperationalIntelligence({
    trips,
    occurrences,
    now,
    hasExplicitPeriod: window.explicit,
    period: window.explicit
      ? {dateFrom: window.dateFrom, dateTo: window.dateTo}
      : undefined,
  });
}
