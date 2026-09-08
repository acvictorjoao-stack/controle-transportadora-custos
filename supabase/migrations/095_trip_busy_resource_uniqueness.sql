-- Achado #4 — proteção de banco contra duplo agendamento de recurso busy.
-- Garante no máximo 1 trip "busy" ativa por veículo e por motorista, por empresa.
-- Status busy: planned, scheduled, loading, in_progress, delivering, waiting.
-- Não altera enum, RLS, grants, get_trip_stats nem dados existentes.

-- ---------------------------------------------------------------------------
-- Preflight fail-fast: se houver duplicidade inesperada, a migration aborta.
-- Sem saneamento automático — escolha arbitrária de registro seria destrutiva.
-- ---------------------------------------------------------------------------

do $$
declare
  v_vehicle_dup_groups integer;
  v_driver_dup_groups integer;
  v_vehicle_sample text;
  v_driver_sample text;
begin
  select count(*)::integer
  into v_vehicle_dup_groups
  from (
    select t.company_id, t.vehicle_id
    from public.trips t
    where t.deleted_at is null
      and t.vehicle_id is not null
      and t.trip_status in (
        'planned',
        'scheduled',
        'loading',
        'in_progress',
        'delivering',
        'waiting'
      )
    group by t.company_id, t.vehicle_id
    having count(*) > 1
  ) vehicle_dups;

  select count(*)::integer
  into v_driver_dup_groups
  from (
    select t.company_id, t.driver_id
    from public.trips t
    where t.deleted_at is null
      and t.driver_id is not null
      and t.trip_status in (
        'planned',
        'scheduled',
        'loading',
        'in_progress',
        'delivering',
        'waiting'
      )
    group by t.company_id, t.driver_id
    having count(*) > 1
  ) driver_dups;

  if v_vehicle_dup_groups > 0 then
    select string_agg(
      format('company=%s vehicle=%s count=%s', d.company_id, d.vehicle_id, d.cnt),
      '; '
    )
    into v_vehicle_sample
    from (
      select t.company_id, t.vehicle_id, count(*)::text as cnt
      from public.trips t
      where t.deleted_at is null
        and t.vehicle_id is not null
        and t.trip_status in (
          'planned',
          'scheduled',
          'loading',
          'in_progress',
          'delivering',
          'waiting'
        )
      group by t.company_id, t.vehicle_id
      having count(*) > 1
      limit 5
    ) d;

    raise exception
      'Migration 095 blocked: % vehicle busy duplicate group(s). Resolve manually before retry. Samples: %',
      v_vehicle_dup_groups,
      coalesce(v_vehicle_sample, '(none)');
  end if;

  if v_driver_dup_groups > 0 then
    select string_agg(
      format('company=%s driver=%s count=%s', d.company_id, d.driver_id, d.cnt),
      '; '
    )
    into v_driver_sample
    from (
      select t.company_id, t.driver_id, count(*)::text as cnt
      from public.trips t
      where t.deleted_at is null
        and t.driver_id is not null
        and t.trip_status in (
          'planned',
          'scheduled',
          'loading',
          'in_progress',
          'delivering',
          'waiting'
        )
      group by t.company_id, t.driver_id
      having count(*) > 1
      limit 5
    ) d;

    raise exception
      'Migration 095 blocked: % driver busy duplicate group(s). Resolve manually before retry. Samples: %',
      v_driver_dup_groups,
      coalesce(v_driver_sample, '(none)');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Índices únicos parciais (não usam ALTER TABLE / CONSTRAINT)
-- ---------------------------------------------------------------------------

create unique index trips_busy_vehicle_unique
  on public.trips (company_id, vehicle_id)
  where deleted_at is null
    and vehicle_id is not null
    and trip_status in (
      'planned',
      'scheduled',
      'loading',
      'in_progress',
      'delivering',
      'waiting'
    );

create unique index trips_busy_driver_unique
  on public.trips (company_id, driver_id)
  where deleted_at is null
    and driver_id is not null
    and trip_status in (
      'planned',
      'scheduled',
      'loading',
      'in_progress',
      'delivering',
      'waiting'
    );

comment on index public.trips_busy_vehicle_unique is
  'Achado #4: no máximo uma trip busy ativa por veículo/empresa';

comment on index public.trips_busy_driver_unique is
  'Achado #4: no máximo uma trip busy ativa por motorista/empresa';
