import type {SupabaseClient} from '@supabase/supabase-js';

import {
  listCompanyTripOccurrences,
  listTrips,
} from '@/features/trips/queries';

import type {OperationalIntelligenceData} from '../types';
import {composeOperationalIntelligence} from '../utils/compose';

function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export interface OperationalIntelligenceLoaderOptions {
  /** ISO date YYYY-MM-DD — filtra viagens por `departed_at`. */
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Loader da Inteligência Operacional.
 * Reutiliza `listTrips` + `listCompanyTripOccurrences` e compõe analytics
 * em memória (sem DRE/financeiro/rateio).
 *
 * Sem opções: janela padrão dos últimos 14 dias nas ocorrências
 * (comportamento histórico; viagens = últimas 500).
 * Com `dateFrom`/`dateTo`: aplica o intervalo também em `listTrips`.
 */
export async function getOperationalIntelligenceData(
  supabase: SupabaseClient,
  companyId: string,
  options: OperationalIntelligenceLoaderOptions = {},
): Promise<OperationalIntelligenceData> {
  const hasExplicitWindow =
    Boolean(options.dateFrom) || Boolean(options.dateTo);
  const occurrenceDateFrom =
    options.dateFrom ?? daysAgoIso(14);

  const [tripsPage, occurrences] = await Promise.all([
    listTrips(supabase, {
      companyId,
      page: 1,
      pageSize: 500,
      sort: {sortBy: 'created_at', sortOrder: 'desc'},
      filters: hasExplicitWindow
        ? {
            dateFrom: options.dateFrom,
            dateTo: options.dateTo,
          }
        : undefined,
    }),
    listCompanyTripOccurrences(supabase, companyId, {
      dateFrom: occurrenceDateFrom,
      limit: 500,
    }),
  ]);

  return composeOperationalIntelligence({
    trips: tripsPage.items,
    occurrences,
  });
}
