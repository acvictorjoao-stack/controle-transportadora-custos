-- FleetControl Sprint 20 — fuel enums

create type public.fuel_document_type as enum (
  'invoice',
  'receipt',
  'proof',
  'pump_photo',
  'other'
);

comment on type public.fuel_document_type is
  'Types of documents attached to fuel records (NF, cupom, comprovante, foto bomba, outros)';

create type public.fuel_inconsistency_flag as enum (
  'odometer_decrease',
  'odometer_missing',
  'amount_mismatch',
  'consumption_outlier',
  'future_date',
  'duplicate_same_day'
);

comment on type public.fuel_inconsistency_flag is
  'Flags for inconsistent fuel records — prepared for future alerts';
