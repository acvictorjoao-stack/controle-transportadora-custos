import type {EntityStatus, ProvisionStatus} from './types';

export const COMPANIES_PAGE_SIZE = 10;

export const COMPANY_LIST_COLUMNS =
  'id, legal_name, trade_name, tax_id, slug, settings, status, provision_status, created_at' as const;

export const COMPANY_DETAIL_COLUMNS =
  'id, legal_name, trade_name, tax_id, slug, email, phone, settings, status, provision_status, provisioned_at, provision_error, created_at, updated_at, deleted_at' as const;

export const ENTITY_STATUS_LABELS: Record<EntityStatus, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  blocked: 'Bloqueada',
  archived: 'Arquivada',
};

export const PROVISION_STATUS_LABELS: Record<ProvisionStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  error: 'Erro',
};
