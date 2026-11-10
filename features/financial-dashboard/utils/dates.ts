import {startOfBusinessDay, toCivilDate, todayCivilDate} from '@/lib/formatting/date';

/**
 * Data YYYY-MM-DD. Sem argumento: hoje no fuso de negócio (servidor e navegador concordam).
 * Com argumento: dia/mês/ano locais da data informada.
 */
export function localDateIso(date?: Date): string {
  if (!date) return todayCivilDate();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonthIso(date: Date = startOfBusinessDay()): string {
  return localDateIso(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function paidAtDateIso(paidAt: string | null): string | null {
  return toCivilDate(paidAt);
}
