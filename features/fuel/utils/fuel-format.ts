import type {FuelInconsistencyFlag} from '../types';

export const FUEL_TYPE_LABELS: Record<string, string> = {
  diesel: 'Diesel',
  gasoline: 'Gasolina',
  ethanol: 'Etanol',
  flex: 'Flex',
  gnv: 'GNV',
  electric: 'Elétrico',
  hybrid: 'Híbrido',
  other: 'Outro',
};

export const FUEL_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  invoice: 'Nota Fiscal',
  receipt: 'Cupom',
  proof: 'Comprovante',
  pump_photo: 'Foto da bomba',
  other: 'Outro',
};

export const FUEL_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro',
  update: 'Edição',
  delete: 'Exclusão',
  document_upload: 'Upload',
  correction: 'Correção',
  metrics_recalculated: 'Métricas recalculadas',
  vehicle_change: 'Troca de veículo',
  driver_change: 'Troca de motorista',
};

export const FUEL_INCONSISTENCY_LABELS: Record<FuelInconsistencyFlag, string> = {
  odometer_decrease: 'Odômetro menor que o anterior',
  odometer_missing: 'Odômetro ausente',
  amount_mismatch: 'Valor total inconsistente',
  consumption_outlier: 'Consumo fora do padrão',
  future_date: 'Data futura',
  duplicate_same_day: 'Possível duplicidade no mesmo dia',
};

export function formatCurrencyBr(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatLiters(value: number): string {
  return `${value.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 3})} L`;
}

export function formatDateBr(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function formatDateTimeBr(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatKmPerLiter(value: number | null): string {
  if (value === null) return '—';
  return `${value.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} km/L`;
}

export function formatPercentage(value: number | null): string {
  if (value === null) return '—';
  return `${value.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%`;
}
