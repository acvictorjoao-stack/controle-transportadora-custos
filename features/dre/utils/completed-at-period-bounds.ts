import {DEFAULT_COMPANY_SETTINGS} from '@/features/organization/settings/types';

/**
 * Fuso de negócio padrão do sistema (CompanySettings).
 * Audit #15 — não inventar outro IANA; reutilizar o já configurado.
 */
export const BUSINESS_TIMEZONE = DEFAULT_COMPANY_SETTINGS.timezone;

function readZonedWallParts(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs));

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== 'literal') map[part.type] = part.value;
  }

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function parseCivilDate(civilDate: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(civilDate.trim());
  if (!match) {
    throw new Error(`Invalid civil date (expected YYYY-MM-DD): ${civilDate}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

/** Soma dias em uma data civil YYYY-MM-DD (calendário gregoriano). */
export function addCivilDays(civilDate: string, days: number): string {
  const {year, month, day} = parseCivilDate(civilDate);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

/**
 * Instante UTC (epoch ms) correspondente a `YYYY-MM-DD 00:00:00.000`
 * no fuso de negócio informado.
 */
export function zonedCivilDayStartUtcMs(
  civilDate: string,
  timeZone: string = BUSINESS_TIMEZONE,
): number {
  const {year, month, day} = parseCivilDate(civilDate);
  const desiredAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  // Converge o offset local → UTC via Intl (sem hardcode de -03:00).
  let guess = desiredAsUtc;
  for (let i = 0; i < 4; i++) {
    const local = readZonedWallParts(guess, timeZone);
    const localAsUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
      0,
    );
    const offset = guess - localAsUtc;
    guess = desiredAsUtc + offset;
  }

  return guess;
}

/** Início inclusivo do dia civil em ISO UTC. */
export function civilDateStartUtcIso(
  civilDate: string,
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  return new Date(zonedCivilDayStartUtcMs(civilDate, timeZone)).toISOString();
}

/**
 * Limite exclusivo do período que termina em `civilDate`
 * (= início do dia civil seguinte no fuso de negócio).
 */
export function civilDateEndExclusiveUtcIso(
  civilDate: string,
  timeZone: string = BUSINESS_TIMEZONE,
): string {
  return civilDateStartUtcIso(addCivilDays(civilDate, 1), timeZone);
}

export type CompletedAtPeriodBounds = {
  /** `completed_at >= gte` (início do dateFrom local). */
  gte?: string;
  /** `completed_at < lt` (início do dia seguinte a dateTo local). */
  lt?: string;
};

/**
 * Converte datas civis do filtro (sem horário) em bounds UTC semiabertos
 * `[start, end)` no fuso de negócio.
 *
 * Preferido ao antigo `${dateTo}T23:59:59.999Z` (UTC literal).
 */
export function buildCompletedAtPeriodBounds(
  filters: {dateFrom?: string | null; dateTo?: string | null},
  timeZone: string = BUSINESS_TIMEZONE,
): CompletedAtPeriodBounds {
  const bounds: CompletedAtPeriodBounds = {};
  if (filters.dateFrom) {
    bounds.gte = civilDateStartUtcIso(filters.dateFrom, timeZone);
  }
  if (filters.dateTo) {
    bounds.lt = civilDateEndExclusiveUtcIso(filters.dateTo, timeZone);
  }
  return bounds;
}

/** Classifica se um instante UTC cai no período civil local `[from, to]`. */
export function isUtcInstantInCivilPeriod(
  utcIso: string,
  dateFrom: string,
  dateTo: string,
  timeZone: string = BUSINESS_TIMEZONE,
): boolean {
  const ms = Date.parse(utcIso);
  if (!Number.isFinite(ms)) return false;
  const start = zonedCivilDayStartUtcMs(dateFrom, timeZone);
  const endExclusive = zonedCivilDayStartUtcMs(addCivilDays(dateTo, 1), timeZone);
  return ms >= start && ms < endExclusive;
}
