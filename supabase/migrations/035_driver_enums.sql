-- FleetControl Sprint 18 — Driver ENUM types

create type public.driver_operational_status as enum (
  'active',
  'inactive'
);

comment on type public.driver_operational_status is
  'Operational status of a driver (active, inactive)';

create type public.driver_license_category as enum (
  'A',
  'B',
  'C',
  'D',
  'E',
  'AB',
  'AC',
  'AD',
  'AE'
);

comment on type public.driver_license_category is 'CNH license category';

create type public.driver_contract_type as enum (
  'clt',
  'pj',
  'autonomo',
  'agregado',
  'terceiro'
);

comment on type public.driver_contract_type is 'Driver employment/contract type';

create type public.driver_document_type as enum (
  'photo',
  'cnh_front',
  'cnh_back',
  'proof',
  'aso',
  'document'
);

comment on type public.driver_document_type is 'Driver file/document classification';
