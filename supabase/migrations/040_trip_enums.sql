-- FleetControl Sprint 19 — trip enums

create type public.trip_status as enum (
  'planned',
  'scheduled',
  'loading',
  'in_progress',
  'delivering',
  'waiting',
  'completed',
  'cancelled',
  'returned'
);

create type public.trip_document_type as enum (
  'cte',
  'mdfe',
  'nfe',
  'canhoto',
  'photo',
  'receipt',
  'checklist',
  'other'
);

create type public.trip_occurrence_type as enum (
  'delay',
  'breakdown',
  'accident',
  'fine',
  'redelivery',
  'return',
  'missing_document',
  'other'
);

create type public.trip_expense_type as enum (
  'toll',
  'food',
  'lodging',
  'tire_shop',
  'maintenance',
  'other'
);

comment on type public.trip_status is 'Operational lifecycle status of a fleet trip';
comment on type public.trip_document_type is 'Types of documents attached to trips';
comment on type public.trip_occurrence_type is 'Incident types during a trip';
comment on type public.trip_expense_type is 'Expense categories for trip costs (no finance integration yet)';
