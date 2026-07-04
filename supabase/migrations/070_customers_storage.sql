-- FleetControl Sprint 24 — Supabase Storage for customer files

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-files',
  'customer-files',
  true,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {company_id}/{customer_id}/{filename}
create policy customer_files_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'customer-files'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'customers:update'
    )
  );

create policy customer_files_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'customer-files'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'customers:update'
    )
  );

create policy customer_files_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'customer-files'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'customers:update'
    )
  );

create policy customer_files_select
  on storage.objects
  for select
  to public
  using (bucket_id = 'customer-files');

-- ---------------------------------------------------------------------------
-- Trips and financial integration — customer FK columns
-- ---------------------------------------------------------------------------

alter table public.trips
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists customer_contract_id uuid references public.customer_contracts (id) on delete set null,
  add column if not exists freight_table text,
  add column if not exists contracted_freight_value numeric(14, 2),
  add column if not exists actual_freight_value numeric(14, 2),
  add column if not exists freight_margin numeric(14, 2);

create index if not exists idx_trips_company_customer
  on public.trips (company_id, customer_id)
  where deleted_at is null and customer_id is not null;

create index if not exists idx_trips_company_customer_contract
  on public.trips (company_id, customer_contract_id)
  where deleted_at is null and customer_contract_id is not null;

alter table public.financial_entries
  add column if not exists customer_id uuid references public.customers (id) on delete set null,
  add column if not exists customer_contract_id uuid references public.customer_contracts (id) on delete set null;

create index if not exists idx_financial_entries_company_customer
  on public.financial_entries (company_id, customer_id)
  where deleted_at is null and customer_id is not null;

create index if not exists idx_financial_entries_company_customer_contract
  on public.financial_entries (company_id, customer_contract_id)
  where deleted_at is null and customer_contract_id is not null;

comment on column public.trips.customer_id is 'Customer linked to the trip';
comment on column public.trips.customer_contract_id is 'Contract used for freight pricing';
comment on column public.financial_entries.customer_id is 'Customer for receivable/payable entries';
comment on column public.financial_entries.customer_contract_id is 'Contract reference for billing';
