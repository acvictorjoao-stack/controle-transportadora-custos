import type {
  MaintenanceAlertType,
  MaintenanceDocumentType,
  MaintenancePriority,
  MaintenanceScheduleType,
  MaintenanceStatus,
  MaintenanceType,
} from '../types';

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  preventive: 'Preventiva',
  corrective: 'Corretiva',
  emergency: 'Emergencial',
  warranty: 'Garantia',
  review: 'Revisão',
  oil_change: 'Troca de óleo',
  brakes: 'Freios',
  suspension: 'Suspensão',
  engine: 'Motor',
  electrical: 'Elétrica',
  cooling: 'Arrefecimento',
  transmission: 'Transmissão',
  tires: 'Pneus',
  other: 'Outros',
};

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  waiting_parts: 'Aguardando peças',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export const MAINTENANCE_DOCUMENT_TYPE_LABELS: Record<MaintenanceDocumentType, string> = {
  budget: 'Orçamento',
  invoice: 'Nota fiscal',
  photo: 'Foto',
  service_order: 'Ordem de serviço',
  report: 'Laudo',
  other: 'Outro',
};

export const MAINTENANCE_SCHEDULE_TYPE_LABELS: Record<MaintenanceScheduleType, string> = {
  oil_change: 'Troca de óleo',
  review: 'Revisão',
  preventive: 'Preventiva',
};

export const MAINTENANCE_ALERT_TYPE_LABELS: Record<MaintenanceAlertType, string> = {
  km: 'Quilometragem',
  date: 'Data',
  hour_meter: 'Horímetro',
};

export const MAINTENANCE_HISTORY_ACTION_LABELS: Record<string, string> = {
  create: 'Cadastro',
  update: 'Edição',
  delete: 'Exclusão',
  status_change: 'Mudança de status',
  completion: 'Conclusão',
  document_upload: 'Upload de documento',
  parts_add: 'Peça adicionada',
  parts_update: 'Peça alterada',
  parts_delete: 'Peça removida',
  services_add: 'Serviço adicionado',
  services_update: 'Serviço alterado',
  services_delete: 'Serviço removido',
};

export function formatCurrencyBr(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'});
}

export function formatDateTimeBr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export function formatDateBr(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR');
}

export function formatHours(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})} h`;
}
