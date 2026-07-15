/** Data local (YYYY-MM-DD) sem deslocar fuso via toISOString. */
export function localDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonthIso(date = new Date()): string {
  return localDateIso(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function paidAtDateIso(paidAt: string | null): string | null {
  if (!paidAt) return null;
  return paidAt.slice(0, 10);
}
