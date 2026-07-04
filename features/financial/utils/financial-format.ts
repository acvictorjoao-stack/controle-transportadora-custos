export function formatCurrencyBr(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

export function formatDateBr(value: string | null): string {
  if (!value) return '—';
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTimeBr(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%`;
}
