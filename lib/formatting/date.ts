import {DEFAULT_COMPANY_SETTINGS} from '@/features/organization/settings/types';

/**
 * Fuso de negócio do sistema (CompanySettings).
 *
 * Toda data exibida passa por ele: o servidor (UTC) e o navegador precisam
 * produzir o mesmo texto, senão o React acusa divergência de hidratação (#418).
 */
export const BUSINESS_TIMEZONE = DEFAULT_COMPANY_SETTINGS.timezone;

const EMPTY = '—';
const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BUSINESS_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BUSINESS_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const dateTimeWithoutSecondsFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BUSINESS_TIMEZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** `en-CA` formata como YYYY-MM-DD. */
const civilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function isCivilDate(value: string): boolean {
  return CIVIL_DATE_PATTERN.test(value);
}

function parseInstant(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Data civil YYYY-MM-DD de um valor do banco.
 * Coluna `date` volta como está; `timestamptz` é convertido para o fuso de negócio.
 */
export function toCivilDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (isCivilDate(trimmed)) return trimmed;
  const instant = parseInstant(trimmed);
  return instant ? civilDateFormatter.format(instant) : null;
}

/** Data de hoje (YYYY-MM-DD) no fuso de negócio. */
export function todayCivilDate(now: Date = new Date()): string {
  return civilDateFormatter.format(now);
}

/** Soma dias a uma data civil YYYY-MM-DD, sem depender do fuso de quem executa. */
export function addCivilDays(civilDate: string, days: number): string {
  const match = CIVIL_DATE_PATTERN.exec(civilDate);
  if (!match) {
    throw new Error(`Data civil inválida (esperado YYYY-MM-DD): ${civilDate}`);
  }
  const utc = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days),
  );
  return utc.toISOString().slice(0, 10);
}

/**
 * DD/MM/AAAA.
 * Coluna `date` (YYYY-MM-DD) não passa por `Date`: lida como meia-noite UTC,
 * viraria o dia anterior no Brasil.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const trimmed = value.trim();
  const civil = CIVIL_DATE_PATTERN.exec(trimmed);
  if (civil) return `${civil[3]}/${civil[2]}/${civil[1]}`;
  const instant = parseInstant(trimmed);
  return instant ? dateFormatter.format(instant) : EMPTY;
}

/** DD/MM/AAAA, HH:mm:ss (ou sem segundos) no fuso de negócio. */
export function formatDateTime(
  value: string | null | undefined,
  options: {seconds?: boolean} = {},
): string {
  if (!value) return EMPTY;
  const trimmed = value.trim();
  if (isCivilDate(trimmed)) return formatDate(trimmed);
  const instant = parseInstant(trimmed);
  if (!instant) return EMPTY;
  const formatter =
    options.seconds === false ? dateTimeWithoutSecondsFormatter : dateTimeFormatter;
  return formatter.format(instant);
}
