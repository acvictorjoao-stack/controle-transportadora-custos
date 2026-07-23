/** Shared installment schedule helpers (RC 27.1.1). */

export const DEFAULT_INSTALLMENT_INTERVAL_DAYS = 30;
export const MIN_INSTALLMENT_COUNT = 1;
export const MAX_INSTALLMENT_COUNT = 48;

export interface InstallmentScheduleInput {
  totalAmount: number;
  installmentCount: number;
  firstDueDate: string;
  intervalDays?: number;
}

export interface InstallmentScheduleItem {
  /** 1-based installment number. */
  number: number;
  amount: number;
  dueDate: string;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/** Split amount into N parts in cents; remainder goes to the last installment. */
export function splitAmountIntoInstallments(
  totalAmount: number,
  installmentCount: number,
): number[] {
  const count = Math.max(MIN_INSTALLMENT_COUNT, Math.floor(installmentCount));
  if (count === 1) return [roundMoney(totalAmount)];

  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / count);
  const remainder = totalCents - baseCents * count;

  return Array.from({length: count}, (_, index) => {
    const cents = baseCents + (index === count - 1 ? remainder : 0);
    return cents / 100;
  });
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Build due dates and amounts for Contas a Pagar installments.
 * Interval is applied between consecutive parcels (default 30 days).
 */
export function buildInstallmentSchedule(
  input: InstallmentScheduleInput,
): InstallmentScheduleItem[] {
  const count = Math.min(
    MAX_INSTALLMENT_COUNT,
    Math.max(MIN_INSTALLMENT_COUNT, Math.floor(input.installmentCount)),
  );
  const intervalDays =
    input.intervalDays && input.intervalDays > 0
      ? Math.floor(input.intervalDays)
      : DEFAULT_INSTALLMENT_INTERVAL_DAYS;
  const firstDue = parseDateOnly(input.firstDueDate.slice(0, 10));
  const amounts = splitAmountIntoInstallments(input.totalAmount, count);

  return amounts.map((amount, index) => ({
    number: index + 1,
    amount,
    dueDate: formatDateOnly(addDays(firstDue, intervalDays * index)),
  }));
}

export function formatInstallmentLabel(number: number, total: number): string {
  return `Parcela ${number}/${total}`;
}
