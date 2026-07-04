-- FleetControl Sprint 24 — customer and contract enums

create type public.customer_status as enum ('active', 'inactive', 'prospect', 'blocked');
comment on type public.customer_status is 'Commercial status of a customer';

create type public.customer_segment as enum (
  'industrial',
  'commercial',
  'retail',
  'services',
  'agribusiness',
  'other'
);
comment on type public.customer_segment is 'Market segment of a customer';

create type public.customer_address_type as enum (
  'delivery',
  'pickup',
  'billing',
  'headquarters',
  'branch'
);
comment on type public.customer_address_type is 'Type of customer address';

create type public.customer_contract_status as enum (
  'draft',
  'active',
  'suspended',
  'expired',
  'cancelled',
  'renewed'
);
comment on type public.customer_contract_status is 'Lifecycle status of a customer contract';

create type public.customer_contract_type as enum (
  'spot',
  'dedicated',
  'distribution',
  'milk_run',
  'other'
);
comment on type public.customer_contract_type is 'Commercial contract type';

create type public.customer_readjustment_index as enum (
  'none',
  'ipca',
  'igpm',
  'inpc',
  'diesel',
  'custom'
);
comment on type public.customer_readjustment_index is 'Price readjustment index for contracts';

create type public.customer_document_type as enum (
  'contract',
  'addendum',
  'power_of_attorney',
  'documentation',
  'other'
);
comment on type public.customer_document_type is 'Customer document classification';
