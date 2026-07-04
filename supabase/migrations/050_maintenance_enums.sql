-- FleetControl Sprint 21 — maintenance enums

create type public.maintenance_type as enum (
  'preventive',
  'corrective',
  'emergency',
  'warranty',
  'review',
  'oil_change',
  'brakes',
  'suspension',
  'engine',
  'electrical',
  'cooling',
  'transmission',
  'tires',
  'other'
);

comment on type public.maintenance_type is
  'Types of fleet maintenance (preventiva, corretiva, emergencial, garantia, revisão, etc.)';

create type public.maintenance_priority as enum (
  'low',
  'medium',
  'high',
  'critical'
);

comment on type public.maintenance_priority is
  'Priority level for maintenance records';

create type public.maintenance_status as enum (
  'open',
  'in_progress',
  'waiting_parts',
  'completed',
  'cancelled'
);

comment on type public.maintenance_status is
  'Operational status of a maintenance record';

create type public.maintenance_document_type as enum (
  'budget',
  'invoice',
  'photo',
  'service_order',
  'report',
  'other'
);

comment on type public.maintenance_document_type is
  'Types of documents attached to maintenance records';

create type public.maintenance_schedule_type as enum (
  'oil_change',
  'review',
  'preventive'
);

comment on type public.maintenance_schedule_type is
  'Scheduled maintenance categories (troca de óleo, revisões, preventivas)';

create type public.maintenance_alert_type as enum (
  'km',
  'date',
  'hour_meter'
);

comment on type public.maintenance_alert_type is
  'Alert trigger type for maintenance schedules';
