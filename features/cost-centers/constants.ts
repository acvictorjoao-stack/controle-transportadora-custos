export const COST_CENTER_LIST_COLUMNS =
  'id, company_id, code, name, description, is_system, status, created_at, updated_at, deleted_at';

export const COST_CENTERS_PAGE_SIZE = 10;

export const DEFAULT_COST_CENTER_CODES = [
  'OPERACIONAL',
  'ADMINISTRATIVO',
  'COMERCIAL',
  'RH',
  'TI',
] as const;

/** Operational source modules that resolve to OPERACIONAL. */
export const OPERATIONAL_COST_CENTER_SOURCE_MODULES = [
  'fuel',
  'maintenance',
  'tires',
  'fines',
  'tolls',
] as const;
