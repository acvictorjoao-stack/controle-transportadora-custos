import type {TireStatus} from '../types';
import {
  TIRE_DOCUMENT_TYPES,
  TIRE_MOVEMENT_TYPES,
  TIRE_POSITIONS,
  TIRE_STATUSES,
  TIRE_WEAR_LEVELS,
} from '../constants/enums';

export const TIRE_STATUS_LABELS: Record<TireStatus, string> = {
  in_stock: 'Estoque',
  installed: 'Instalado',
  in_retread: 'Recapado',
  discarded: 'Descartado',
  warranty: 'Garantia',
};

export const TIRE_POSITION_LABELS: Record<(typeof TIRE_POSITIONS)[number], string> = {
  front_left: 'Dianteiro esquerdo',
  front_right: 'Dianteiro direito',
  rear_left_outer: 'Traseiro esquerdo externo',
  rear_left_inner: 'Traseiro esquerdo interno',
  rear_right_outer: 'Traseiro direito externo',
  rear_right_inner: 'Traseiro direito interno',
  spare: 'Estepe',
  other: 'Outro',
};

export const TIRE_MOVEMENT_TYPE_LABELS: Record<(typeof TIRE_MOVEMENT_TYPES)[number], string> = {
  install: 'Instalação',
  remove: 'Remoção',
  position_change: 'Troca de posição',
  rotation: 'Rodízio',
};

export const TIRE_DOCUMENT_TYPE_LABELS: Record<(typeof TIRE_DOCUMENT_TYPES)[number], string> = {
  invoice: 'Nota fiscal',
  warranty: 'Garantia',
  photo: 'Foto',
  report: 'Laudo',
  other: 'Outro',
};

export const TIRE_WEAR_LEVEL_LABELS: Record<(typeof TIRE_WEAR_LEVELS)[number], string> = {
  good: 'Bom',
  warning: 'Atenção',
  critical: 'Crítico',
};

export const TIRE_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro',
  delete: 'Exclusão lógica',
  update: 'Atualização',
  vehicle_change: 'Troca de veículo',
  position_change: 'Troca de posição',
  install: 'Instalação',
  remove: 'Remoção',
  rotation: 'Rodízio',
  movement: 'Movimentação',
  inspection: 'Inspeção',
  recap: 'Recapagem',
  document_upload: 'Upload de documento',
};

export function formatCurrencyBr(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'}).format(value);
}

export function formatDateBr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function formatDateTimeBr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export function formatKm(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${new Intl.NumberFormat('pt-BR').format(value)} km`;
}
