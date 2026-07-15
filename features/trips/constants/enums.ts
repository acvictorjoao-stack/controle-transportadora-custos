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

/** Sprint 25.4 — simplified operational lifecycle */
export const SIMPLE_TRIP_STATUSES = [
  'planned',
  'in_progress',
  'completed',
  'cancelled',
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
  'parking',
  'ferry',
  'wash',
  'advance',
  'fine',
  'other',
] as const;
