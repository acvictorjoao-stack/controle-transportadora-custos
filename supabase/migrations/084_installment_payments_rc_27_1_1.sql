-- RC 27.1.1 — Installment payments for operational financial entries
-- Allows N Contas a Pagar parcels per operational source (maintenance/fuel/tires).

-- ---------------------------------------------------------------------------
-- financial_entries: installment columns + relax 1:1 unique indexes
-- ---------------------------------------------------------------------------

alter table public.financial_entries
  add column if not exists installment_number integer,
  add column if not exists installment_total integer;

comment on column public.financial_entries.installment_number is
  '1-based parcel number within an operational installment plan';
comment on column public.financial_entries.installment_total is
  'Total parcels in the installment plan (1 = single payment)';

update public.financial_entries
set
  installment_number = coalesce(installment_number, 1),
  installment_total = coalesce(installment_total, 1)
where deleted_at is null
  and (
    fuel_record_id is not null
    or maintenance_record_id is not null
    or tire_id is not null
  )
  and (installment_number is null or installment_total is null);

alter table public.financial_entries
  drop constraint if exists financial_entries_installment_number_positive;

alter table public.financial_entries
  add constraint financial_entries_installment_number_positive
  check (installment_number is null or installment_number >= 1);

alter table public.financial_entries
  drop constraint if exists financial_entries_installment_total_positive;

alter table public.financial_entries
  add constraint financial_entries_installment_total_positive
  check (installment_total is null or installment_total >= 1);

drop index if exists idx_financial_entries_fuel_record_active;
drop index if exists idx_financial_entries_maintenance_record_active;

-- tire unique index may or may not exist depending on env
do $$
begin
  if exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_financial_entries_tire_active'
  ) then
    execute 'drop index public.idx_financial_entries_tire_active';
  end if;
end $$;

create unique index if not exists idx_financial_entries_fuel_installment_active
  on public.financial_entries (company_id, fuel_record_id, installment_number)
  where deleted_at is null
    and fuel_record_id is not null
    and installment_number is not null;

create unique index if not exists idx_financial_entries_maintenance_installment_active
  on public.financial_entries (company_id, maintenance_record_id, installment_number)
  where deleted_at is null
    and maintenance_record_id is not null
    and installment_number is not null;

create unique index if not exists idx_financial_entries_tire_installment_active
  on public.financial_entries (company_id, tire_id, installment_number)
  where deleted_at is null
    and tire_id is not null
    and installment_number is not null;

create index if not exists idx_financial_entries_company_installment
  on public.financial_entries (company_id, installment_number)
  where deleted_at is null and installment_number is not null;

-- ---------------------------------------------------------------------------
-- Operational source tables: installment plan fields
-- ---------------------------------------------------------------------------

alter table public.maintenance_records
  add column if not exists installment_count integer not null default 1,
  add column if not exists installment_interval_days integer not null default 30;

alter table public.fuel_records
  add column if not exists installment_count integer not null default 1,
  add column if not exists installment_interval_days integer not null default 30;

alter table public.tires
  add column if not exists installment_count integer not null default 1,
  add column if not exists installment_interval_days integer not null default 30;

alter table public.maintenance_records
  drop constraint if exists maintenance_records_installment_count_check;
alter table public.maintenance_records
  add constraint maintenance_records_installment_count_check
  check (installment_count >= 1 and installment_count <= 48);

alter table public.maintenance_records
  drop constraint if exists maintenance_records_installment_interval_check;
alter table public.maintenance_records
  add constraint maintenance_records_installment_interval_check
  check (installment_interval_days >= 1 and installment_interval_days <= 365);

alter table public.fuel_records
  drop constraint if exists fuel_records_installment_count_check;
alter table public.fuel_records
  add constraint fuel_records_installment_count_check
  check (installment_count >= 1 and installment_count <= 48);

alter table public.fuel_records
  drop constraint if exists fuel_records_installment_interval_check;
alter table public.fuel_records
  add constraint fuel_records_installment_interval_check
  check (installment_interval_days >= 1 and installment_interval_days <= 365);

alter table public.tires
  drop constraint if exists tires_installment_count_check;
alter table public.tires
  add constraint tires_installment_count_check
  check (installment_count >= 1 and installment_count <= 48);

alter table public.tires
  drop constraint if exists tires_installment_interval_check;
alter table public.tires
  add constraint tires_installment_interval_check
  check (installment_interval_days >= 1 and installment_interval_days <= 365);

comment on column public.maintenance_records.installment_count is
  'Number of Contas a Pagar parcels when payment_type = credit';
comment on column public.maintenance_records.installment_interval_days is
  'Days between installment due dates (default 30)';
comment on column public.fuel_records.installment_count is
  'Number of Contas a Pagar parcels when payment_type = credit';
comment on column public.fuel_records.installment_interval_days is
  'Days between installment due dates (default 30)';
comment on column public.tires.installment_count is
  'Number of Contas a Pagar parcels when payment_type = credit';
comment on column public.tires.installment_interval_days is
  'Days between installment due dates (default 30)';
