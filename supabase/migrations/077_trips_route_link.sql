-- FleetControl Sprint 25.2 — Link trips to operational routes

alter table public.trips
  add column if not exists route_id uuid references public.routes (id) on delete set null,
  add column if not exists planned_distance_km numeric(10, 2),
  add column if not exists lead_time_minutes integer,
  add column if not exists unload_time_minutes integer,
  add column if not exists planned_departure_at timestamptz,
  add column if not exists planned_arrival_at timestamptz,
  add column if not exists planned_completion_at timestamptz;

alter table public.trips
  drop constraint if exists trips_planned_distance_non_negative,
  drop constraint if exists trips_lead_time_non_negative,
  drop constraint if exists trips_unload_time_non_negative;

alter table public.trips
  add constraint trips_planned_distance_non_negative
    check (planned_distance_km is null or planned_distance_km >= 0),
  add constraint trips_lead_time_non_negative
    check (lead_time_minutes is null or lead_time_minutes >= 0),
  add constraint trips_unload_time_non_negative
    check (unload_time_minutes is null or unload_time_minutes >= 0);

create index if not exists idx_trips_company_route_id
  on public.trips (company_id, route_id)
  where deleted_at is null and route_id is not null;

create index if not exists idx_trips_company_planned_departure
  on public.trips (company_id, planned_departure_at desc)
  where deleted_at is null and planned_departure_at is not null;

comment on column public.trips.route_id is
  'Operational route used for trip planning (nullable for legacy trips)';
comment on column public.trips.planned_distance_km is
  'Snapshot of planned distance (km) from the selected route';
comment on column public.trips.lead_time_minutes is
  'Snapshot of planned lead time (minutes) from the selected route';
comment on column public.trips.unload_time_minutes is
  'Snapshot of average unload time (minutes) from the selected route';
comment on column public.trips.planned_departure_at is
  'Planned departure datetime used for arrival/completion forecasts';
comment on column public.trips.planned_arrival_at is
  'Forecast arrival = planned_departure_at + lead_time_minutes';
comment on column public.trips.planned_completion_at is
  'Forecast completion = planned_departure_at + lead_time_minutes + unload_time_minutes';

-- Extend history logging for route linkage and planning fields
create or replace function public.log_trip_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_action text := 'update';
  v_actor uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.trip_history (
      company_id,
      branch_id,
      trip_id,
      action,
      changes,
      new_trip_status,
      created_by
    )
    values (
      new.company_id,
      new.branch_id,
      new.id,
      'create',
      jsonb_build_object(
        'trip_number', new.trip_number,
        'trip_status', new.trip_status,
        'driver_id', new.driver_id,
        'vehicle_id', new.vehicle_id,
        'route_id', new.route_id,
        'origin', new.origin,
        'destination', new.destination
      ),
      new.trip_status,
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.trip_history (
        company_id,
        branch_id,
        trip_id,
        action,
        changes,
        previous_trip_status,
        new_trip_status,
        created_by
      )
      values (
        new.company_id,
        new.branch_id,
        new.id,
        'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        old.trip_status,
        new.trip_status,
        v_actor
      );
      return new;
    end if;

    if old.trip_status is distinct from new.trip_status then
      v_action := 'status_change';
    end if;

    if old.driver_id is distinct from new.driver_id and v_action = 'update' then
      v_action := 'driver_change';
    end if;

    if old.vehicle_id is distinct from new.vehicle_id and v_action = 'update' then
      v_action := 'vehicle_change';
    end if;

    if old.arrived_at is null and new.arrived_at is not null and v_action = 'update' then
      v_action := 'completion';
    end if;

    if old.trip_status is distinct from new.trip_status then
      v_changes := v_changes || jsonb_build_object(
        'trip_status', jsonb_build_object('from', old.trip_status, 'to', new.trip_status)
      );
    end if;
    if old.driver_id is distinct from new.driver_id then
      v_changes := v_changes || jsonb_build_object(
        'driver_id', jsonb_build_object('from', old.driver_id, 'to', new.driver_id)
      );
    end if;
    if old.vehicle_id is distinct from new.vehicle_id then
      v_changes := v_changes || jsonb_build_object(
        'vehicle_id', jsonb_build_object('from', old.vehicle_id, 'to', new.vehicle_id)
      );
    end if;
    if old.route_id is distinct from new.route_id then
      v_changes := v_changes || jsonb_build_object(
        'route_id', jsonb_build_object('from', old.route_id, 'to', new.route_id)
      );
    end if;
    if old.origin is distinct from new.origin then
      v_changes := v_changes || jsonb_build_object(
        'origin', jsonb_build_object('from', old.origin, 'to', new.origin)
      );
    end if;
    if old.destination is distinct from new.destination then
      v_changes := v_changes || jsonb_build_object(
        'destination', jsonb_build_object('from', old.destination, 'to', new.destination)
      );
    end if;
    if old.planned_distance_km is distinct from new.planned_distance_km then
      v_changes := v_changes || jsonb_build_object(
        'planned_distance_km',
        jsonb_build_object('from', old.planned_distance_km, 'to', new.planned_distance_km)
      );
    end if;
    if old.lead_time_minutes is distinct from new.lead_time_minutes then
      v_changes := v_changes || jsonb_build_object(
        'lead_time_minutes',
        jsonb_build_object('from', old.lead_time_minutes, 'to', new.lead_time_minutes)
      );
    end if;
    if old.unload_time_minutes is distinct from new.unload_time_minutes then
      v_changes := v_changes || jsonb_build_object(
        'unload_time_minutes',
        jsonb_build_object('from', old.unload_time_minutes, 'to', new.unload_time_minutes)
      );
    end if;
    if old.planned_departure_at is distinct from new.planned_departure_at then
      v_changes := v_changes || jsonb_build_object(
        'planned_departure_at',
        jsonb_build_object('from', old.planned_departure_at, 'to', new.planned_departure_at)
      );
    end if;
    if old.planned_arrival_at is distinct from new.planned_arrival_at then
      v_changes := v_changes || jsonb_build_object(
        'planned_arrival_at',
        jsonb_build_object('from', old.planned_arrival_at, 'to', new.planned_arrival_at)
      );
    end if;
    if old.planned_completion_at is distinct from new.planned_completion_at then
      v_changes := v_changes || jsonb_build_object(
        'planned_completion_at',
        jsonb_build_object('from', old.planned_completion_at, 'to', new.planned_completion_at)
      );
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.trip_history (
      company_id,
      branch_id,
      trip_id,
      action,
      changes,
      previous_trip_status,
      new_trip_status,
      created_by
    )
    values (
      new.company_id,
      new.branch_id,
      new.id,
      v_action,
      v_changes,
      old.trip_status,
      new.trip_status,
      v_actor
    );
    return new;
  end if;

  return new;
end;
$$;
