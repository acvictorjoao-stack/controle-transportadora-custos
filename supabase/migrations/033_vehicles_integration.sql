-- FleetControl Sprint 17.1 — Vehicle integration fields and performance

-- ---------------------------------------------------------------------------
-- Structural fields for storage consistency and external integrations
-- ---------------------------------------------------------------------------

alter table public.vehicle_documents
  add column if not exists storage_path text;

comment on column public.vehicle_documents.storage_path is
  'Supabase Storage object path for cleanup on soft delete';

alter table public.vehicles
  add column if not exists photo_storage_path text,
  add column if not exists crlv_storage_path text,
  add column if not exists external_id text,
  add column if not exists integration_source text;

comment on column public.vehicles.photo_storage_path is
  'Storage path for the vehicle photo asset';

comment on column public.vehicles.crlv_storage_path is
  'Storage path for the CRLV document asset';

comment on column public.vehicles.external_id is
  'External identifier from telematics/ERP integrations (BI)';

comment on column public.vehicles.integration_source is
  'Source system for external_id (e.g. sascar, onixsat)';

create index if not exists idx_vehicles_company_created_at
  on public.vehicles (company_id, created_at desc)
  where deleted_at is null;

create index if not exists idx_vehicles_company_external_id
  on public.vehicles (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

-- ---------------------------------------------------------------------------
-- Aggregated fleet stats (RLS enforced via security invoker)
-- ---------------------------------------------------------------------------

create or replace function public.get_vehicle_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'total', count(*)::int,
    'active', count(*) filter (where asset_status = 'active')::int,
    'maintenance', count(*) filter (where asset_status = 'maintenance')::int,
    'inactive', count(*) filter (where asset_status = 'inactive')::int,
    'sold', count(*) filter (where asset_status = 'sold')::int,
    'average_odometer_km', coalesce(round(avg(current_odometer_km))::int, 0)
  )
  from public.vehicles
  where company_id = p_company_id
    and deleted_at is null;
$$;

comment on function public.get_vehicle_stats(uuid) is
  'Aggregated fleet statistics for dashboard KPIs';

grant execute on function public.get_vehicle_stats(uuid) to authenticated;
