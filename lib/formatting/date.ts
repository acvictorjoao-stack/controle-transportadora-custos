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

const timeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: BUSINESS_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const wallClockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const DATE_TIME_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

/** HH:mm no fuso de negócio. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return EMPTY;
  const instant = parseInstant(value.trim());
  return instant ? timeFormatter.format(instant) : EMPTY;
}

/**
 * Meia-noite local com o dia/mês/ano de hoje no fuso de negócio.
 * Serve de ponto de partida para aritmética de calendário com getDate/setDate:
 * servidor (UTC) e navegador chegam ao mesmo "hoje".
 */
export function startOfBusinessDay(now: Date = new Date()): Date {
  const [year, month, day] = todayCivilDate(now).split('-').map(Number);
  return new Date(year, month - 1, day);
}

function wallClockParts(instant: Date) {
  const map: Record<string, number> = {};
  for (const part of wallClockFormatter.formatToParts(instant)) {
    if (part.type !== 'literal') map[part.type] = Number(part.value);
  }
  return map as Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', number>;
}

/** Valor para `<input type="datetime-local">` (YYYY-MM-DDTHH:mm) no fuso de negócio. */
export function toDateTimeInputValue(value: string | Date | null | undefined): string {
  if (!value) return '';
  const instant = value instanceof Date ? value : parseInstant(value.trim());
  if (!instant || Number.isNaN(instant.getTime())) return '';
  const p = wallClockParts(instant);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/**
 * Converte o valor de `<input type="datetime-local">`, lido como horário do
 * fuso de negócio, em instante ISO (UTC). Sem isso o Postgres grava a hora
 * digitada como se fosse UTC.
 */
export function dateTimeInputToIso(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = DATE_TIME_INPUT_PATTERN.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const desired = Date.UTC(y, mo - 1, d, h, mi);
  let utcMs = desired;
  // Duas passadas convergem o offset do fuso (inclusive em horário de verão).
  for (let i = 0; i < 2; i += 1) {
    const p = wallClockParts(new Date(utcMs));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    utcMs += desired - shown;
  }
  return new Date(utcMs).toISOString();
}
