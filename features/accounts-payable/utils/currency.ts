export function formatCurrencyInput(value: number | string | null | undefined): string {
  const numeric =
    typeof value === 'number'
      ? value
      : Number(
          String(value ?? '')
            .replace(/\s/g, '')
            .replace(/R\$/gi, '')
            .replace(/\./g, '')
            .replace(',', '.'),
        );

  if (!Number.isFinite(numeric) || numeric <= 0) return '';

  return numeric.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function parseCurrencyInput(value: string): number {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function maskCurrencyInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const amount = Number(digits) / 100;
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
