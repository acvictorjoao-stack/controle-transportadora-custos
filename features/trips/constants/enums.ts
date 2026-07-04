export const TRIP_STATUSES = [
  'planned',
  'scheduled',
  'loading',
  'in_progress',
  'delivering',
  'waiting',
  'completed',
  'cancelled',
  'returned',
] as const;

export const TRIP_DOCUMENT_TYPES = [
  'cte',
  'mdfe',
  'nfe',
  'canhoto',
  'photo',
  'receipt',
  'checklist',
  'other',
] as const;

export const TRIP_OCCURRENCE_TYPES = [
  'delay',
  'breakdown',
  'accident',
  'fine',
  'redelivery',
  'return',
  'missing_document',
  'other',
] as const;

export const TRIP_EXPENSE_TYPES = [
  'toll',
  'food',
  'lodging',
  'tire_shop',
  'maintenance',
  'other',
] as const;
