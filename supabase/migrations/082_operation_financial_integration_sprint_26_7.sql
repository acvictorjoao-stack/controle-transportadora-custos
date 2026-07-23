-- Sprint 26.7.1 — Automatic financial integration from operational modules
-- Retrocompatible: additive columns only; no RLS/RBAC changes.

-- ---------------------------------------------------------------------------
-- financial_entries.source_id — polymorphic operational source reference
-- ---------------------------------------------------------------------------

alter table public.financial_entries
  add column if not exists source_id uuid;

comment on column public.financial_entries.source_id is
  'Operational source record id (fuel/maintenance/tire/etc.), paired with source_module';

-- Backfill from existing FK columns
update public.financial_entries
set source_id = coalesce(fuel_record_id, maintenance_record_id, tire_id, trip_id, source_id)
where source_id is null
  and (
    fuel_record_id is not null
    or maintenance_record_id is not null
    or tire_id is not null
    or trip_id is not null
  );

create index if not exists idx_financial_entries_company_source
  on public.financial_entries (company_id, source_module, source_id)
  where deleted_at is null and source_id is not null;

-- Uniqueness is enforced in application service (createFinancialEntryFromOperation).
-- A partial unique index is intentionally omitted to avoid failing on legacy duplicates.

-- ---------------------------------------------------------------------------
-- Operational payment fields (à vista / a prazo)
-- ---------------------------------------------------------------------------

alter table public.fuel_records
  add column if not exists payment_type text not null default 'cash',
  add column if not exists payment_due_date date;

alter table public.fuel_records
  drop constraint if exists fuel_records_payment_type_check;

alter table public.fuel_records
  add constraint fuel_records_payment_type_check
  check (payment_type in ('cash', 'credit'));

alter table public.fuel_records
  drop constraint if exists fuel_records_credit_requires_due_date;

alter table public.fuel_records
  add constraint fuel_records_credit_requires_due_date
  check (payment_type <> 'credit' or payment_due_date is not null);

comment on column public.fuel_records.payment_type is
  'cash = à vista (paid financial entry); credit = a prazo (accounts payable)';
comment on column public.fuel_records.payment_due_date is
  'Due date required when payment_type = credit';

alter table public.maintenance_records
  add column if not exists payment_type text not null default 'cash',
  add column if not exists payment_due_date date;

alter table public.maintenance_records
  drop constraint if exists maintenance_records_payment_type_check;

alter table public.maintenance_records
  add constraint maintenance_records_payment_type_check
  check (payment_type in ('cash', 'credit'));

alter table public.maintenance_records
  drop constraint if exists maintenance_records_credit_requires_due_date;

alter table public.maintenance_records
  add constraint maintenance_records_credit_requires_due_date
  check (payment_type <> 'credit' or payment_due_date is not null);

comment on column public.maintenance_records.payment_type is
  'cash = à vista (paid financial entry); credit = a prazo (accounts payable)';
comment on column public.maintenance_records.payment_due_date is
  'Due date required when payment_type = credit';

alter table public.tires
  add column if not exists payment_type text not null default 'cash',
  add column if not exists payment_due_date date;

alter table public.tires
  drop constraint if exists tires_payment_type_check;

alter table public.tires
  add constraint tires_payment_type_check
  check (payment_type in ('cash', 'credit'));

alter table public.tires
  drop constraint if exists tires_credit_requires_due_date;

alter table public.tires
  add constraint tires_credit_requires_due_date
  check (payment_type <> 'credit' or payment_due_date is not null);

comment on column public.tires.payment_type is
  'cash = à vista (paid financial entry); credit = a prazo (accounts payable)';
comment on column public.tires.payment_due_date is
  'Due date required when payment_type = credit';
