-- Sprint 25.4 — Simple trip lifecycle: start / complete / cancel dates + history

-- ---------------------------------------------------------------------------
-- Lifecycle timestamps and cancel observation
-- ---------------------------------------------------------------------------

alter table public.trips
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_notes text;

comment on column public.trips.started_at is
  'Automatic timestamp when the trip is started (Programada → Em andamento)';
comment on column public.trips.completed_at is
  'Automatic timestamp when the trip is completed';
comment on column public.trips.cancelled_at is
  'Automatic timestamp when the trip is cancelled';
comment on column public.trips.cancellation_notes is
  'Mandatory observation registered when the trip is cancelled';

-- ---------------------------------------------------------------------------
-- History: started / completed / cancelled actions
-- ---------------------------------------------------------------------------

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
      company_id, branch_id, trip_id, action, changes,
      new_trip_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.id, 'create',
      jsonb_build_object(
        'trip_number', new.trip_number,
        'trip_status', new.trip_status,
        'driver_id', new.driver_id,
        'vehicle_id', new.vehicle_id
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
        company_id, branch_id, trip_id, action, changes,
        previous_trip_status, new_trip_status, created_by
      )
      values (
        new.company_id, new.branch_id, new.id, 'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        old.trip_status, new.trip_status, v_actor
      );
      return new;
    end if;

    if old.trip_status is distinct from new.trip_status then
      if new.trip_status = 'in_progress' then
        v_action := 'started';
      elsif new.trip_status = 'completed' then
        v_action := 'completed';
      elsif new.trip_status = 'cancelled' then
        v_action := 'cancelled';
      else
        v_action := 'status_change';
      end if;

      v_changes := v_changes || jsonb_build_object(
        'trip_status', jsonb_build_object('from', old.trip_status, 'to', new.trip_status)
      );
    end if;

    if old.driver_id is distinct from new.driver_id then
      if v_action = 'update' then v_action := 'driver_change'; end if;
      v_changes := v_changes || jsonb_build_object(
        'driver_id', jsonb_build_object('from', old.driver_id, 'to', new.driver_id)
      );
    end if;

    if old.vehicle_id is distinct from new.vehicle_id then
      if v_action = 'update' then v_action := 'vehicle_change'; end if;
      v_changes := v_changes || jsonb_build_object(
        'vehicle_id', jsonb_build_object('from', old.vehicle_id, 'to', new.vehicle_id)
      );
    end if;

    if old.branch_id is distinct from new.branch_id then
      v_changes := v_changes || jsonb_build_object(
        'branch_id', jsonb_build_object('from', old.branch_id, 'to', new.branch_id)
      );
    end if;

    if old.client_name is distinct from new.client_name then
      v_changes := v_changes || jsonb_build_object(
        'client_name', jsonb_build_object('from', old.client_name, 'to', new.client_name)
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

    if old.started_at is distinct from new.started_at and new.started_at is not null then
      v_changes := v_changes || jsonb_build_object('started_at', new.started_at);
    end if;

    if old.completed_at is distinct from new.completed_at and new.completed_at is not null then
      v_changes := v_changes || jsonb_build_object('completed_at', new.completed_at);
    end if;

    if old.cancelled_at is distinct from new.cancelled_at and new.cancelled_at is not null then
      v_changes := v_changes || jsonb_build_object('cancelled_at', new.cancelled_at);
    end if;

    if old.cancellation_notes is distinct from new.cancellation_notes
       and new.cancellation_notes is not null then
      v_changes := v_changes || jsonb_build_object(
        'cancellation_notes', new.cancellation_notes
      );
    end if;

    if old.arrived_at is null and new.arrived_at is not null then
      if v_action = 'update' then v_action := 'completed'; end if;
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.trip_history (
      company_id, branch_id, trip_id, action, changes,
      previous_trip_status, new_trip_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.id, v_action, v_changes,
      old.trip_status, new.trip_status, v_actor
    );
    return new;
  end if;

  return new;
end;
$$;
