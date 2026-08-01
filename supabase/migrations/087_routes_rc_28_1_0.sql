-- FleetControl RC 28.1.0 — route name planning (lead time in days) + cliente/filial
-- Non-destructive: keeps lead_time_minutes / unload_time_minutes; adds lead_time_days,
-- customer_id and branch_id. unload_time_minutes remains unused by new features.

alter table public.routes
  add column if not exists lead_time_days integer;

alter table public.routes
  add column if not exists customer_id uuid references public.customers (id) on delete set null;

alter table public.routes
  add column if not exists branch_id uuid references public.branches (id) on delete set null;

comment on column public.routes.lead_time_days is
  'Lead time in whole days (RC 28.1.0). Preferred planning unit. lead_time_minutes is kept in sync as days * 1440 for trip snapshots.';

comment on column public.routes.customer_id is
  'Optional/required by app: customer linked to the operational route (lookup by name on import).';

comment on column public.routes.branch_id is
  'Branch (filial) linked to the operational route (lookup by name on import).';

comment on column public.routes.name is
  'Display name (Nome da Rota). Optional in UI; when empty the app stores/falls back to Origem → Destino.';

comment on column public.routes.unload_time_minutes is
  'Deprecated for new planning (RC 28.1.0). Kept for legacy rows; no longer used in forms, import or arrival forecasts.';

alter table public.routes
  drop constraint if exists routes_lead_time_days_positive;

alter table public.routes
  add constraint routes_lead_time_days_positive
    check (lead_time_days is null or lead_time_days >= 1);

-- Backfill days from legacy minutes (ceil), minimum 1 day when minutes exist.
update public.routes
set lead_time_days = greatest(1, ceiling(lead_time_minutes::numeric / 1440.0)::integer)
where lead_time_minutes is not null
  and lead_time_days is null;

-- Keep minutes aligned with days for new trip planning (days * 24h).
update public.routes
set lead_time_minutes = lead_time_days * 1440
where lead_time_days is not null;

create index if not exists idx_routes_company_customer
  on public.routes (company_id, customer_id)
  where deleted_at is null and customer_id is not null;

create index if not exists idx_routes_company_branch
  on public.routes (company_id, branch_id)
  where deleted_at is null and branch_id is not null;

create index if not exists idx_routes_missing_lead_time_days
  on public.routes (company_id)
  where deleted_at is null and lead_time_days is null;

create index if not exists idx_routes_origin_destination_customer
  on public.routes (company_id, upper(trim(origin)), upper(trim(destination)), customer_id)
  where deleted_at is null;
