export const TRIP_PAYMENT_CONDITIONS = ['advance', 'term'] as const;

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

/** RC 26.4.2 — opções padronizadas de tipo de carga (V1) */
export const TRIP_CARGO_TYPES = ['SECA', 'FRIA', 'HORTIFRUTI'] as const;

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

/** Quem pagou a despesa da viagem (migration 111, decisão D8). */
export const TRIP_EXPENSE_PAID_BY = ['company', 'driver', 'aggregate', 'third_party'] as const;

/** Instrumento de pagamento da despesa da viagem (migration 111, decisão D2/D8). */
export const TRIP_EXPENSE_PAYMENT_METHODS = [
  'bank_account',
  'corporate_card',
  'toll_tag',
  'cash',
  'not_informed',
  'supplier_credit',
  'own_money',
  'driver_advance',
] as const;
