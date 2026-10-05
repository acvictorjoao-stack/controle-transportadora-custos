import {
  addCivilDays,
  buildCompletedAtPeriodBounds,
  civilDateInTimeZone,
} from '@/features/dre/utils/completed-at-period-bounds';

/** Visão ao vivo (sem de/ate/periodo): últimos N dias civis, incluindo hoje. */
export const LIVE_ANALYSIS_WINDOW_DAYS = 14;

export interface OperationalAnalysisWindow {
  /** `true` quando o período veio da URL (de/ate/periodo). */
  explicit: boolean;
  /** Data civil inicial (YYYY-MM-DD, fuso de negócio). */
  dateFrom?: string;
  /** Data civil final inclusiva (YYYY-MM-DD, fuso de negócio). */
  dateTo?: string;
  /** Início inclusivo em UTC (`>=`). */
  gte?: string;
  /** Fim exclusivo em UTC (`<`). */
  lt?: string;
}

/**
 * Janela analítica única da Inteligência Operacional.
 * Os mesmos bounds `[gte, lt)` valem para viagens (`departed_at`) e
 * ocorrências (`occurred_at`); datas civis são convertidas no fuso de
 * negócio (Audit #15).
 */
export function resolveOperationalAnalysisWindow(
  period: {dateFrom?: string; dateTo?: string},
  now: Date = new Date(),
): OperationalAnalysisWindow {
  const explicit = Boolean(period.dateFrom || period.dateTo);

  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  if (explicit) {
    dateFrom = period.dateFrom || undefined;
    dateTo = period.dateTo || undefined;
  } else {
    dateTo = civilDateInTimeZone(now);
    dateFrom = addCivilDays(dateTo, -(LIVE_ANALYSIS_WINDOW_DAYS - 1));
  }

  return {
    explicit,
    dateFrom,
    dateTo,
    ...buildCompletedAtPeriodBounds({dateFrom, dateTo}),
  };
}
