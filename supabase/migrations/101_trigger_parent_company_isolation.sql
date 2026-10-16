-- FleetControl — triggers SECURITY DEFINER não gravam em outra empresa (A33-01)
-- Itens de contrato, peças/serviços de manutenção e recapagens/inspeções/
-- movimentações de pneu apontavam para o pai por FK simples, e as policies de
-- INSERT só validam o company_id do próprio filho. Os triggers de recálculo
-- rodam como owner (sem RLS) e gravavam no pai pelo id informado: um usuário
-- da empresa A reescrevia receita de contrato, custos de manutenção e
-- métricas/status/veículo de pneus da empresa B.
-- Correção: FK composta (company_id, pai_id) no padrão da 091, e as funções
-- passam a restringir leitura e escrita ao company_id do filho.
-- SECURITY DEFINER continua necessário: o filho é gravado com customers:create,
-- maintenance:update/delete ou tires:update/delete, e o recálculo no pai não
-- pode depender de o usuário também ter update no pai (refresh_tire_metrics
-- nem é executável por authenticated desde a 096).
-- Não altera policies nem grants.

-- ---------------------------------------------------------------------------
-- 1. Pré-checagem: todo filho precisa de pai existente e da mesma empresa
-- ---------------------------------------------------------------------------
-- LEFT JOIN para que filho sem pai (p.id is null) também seja contado.
-- Chave nula não quebraria a FK composta (MATCH SIMPLE a ignora), mas deixaria
-- a linha fora da garantia; por isso também aborta.

do $$
declare
  v_report text;
begin
  select string_agg(
    format('%s (outra empresa: %s, pai inexistente: %s, chave nula: %s)',
      relation, cross_company, orphans, null_keys),
    '; ')
  into v_report
  from (
    select 'customer_contract_items' as relation,
      count(*) filter (where p.id is not null and p.company_id <> c.company_id) as cross_company,
      count(*) filter (where c.contract_id is not null and p.id is null) as orphans,
      count(*) filter (where c.company_id is null or c.contract_id is null) as null_keys
    from public.customer_contract_items c
    left join public.customer_contracts p on p.id = c.contract_id
    union all
    select 'maintenance_parts',
      count(*) filter (where p.id is not null and p.company_id <> c.company_id),
      count(*) filter (where c.maintenance_record_id is not null and p.id is null),
      count(*) filter (where c.company_id is null or c.maintenance_record_id is null)
    from public.maintenance_parts c
    left join public.maintenance_records p on p.id = c.maintenance_record_id
    union all
    select 'maintenance_services',
      count(*) filter (where p.id is not null and p.company_id <> c.company_id),
      count(*) filter (where c.maintenance_record_id is not null and p.id is null),
      count(*) filter (where c.company_id is null or c.maintenance_record_id is null)
    from public.maintenance_services c
    left join public.maintenance_records p on p.id = c.maintenance_record_id
    union all
    select 'tire_recaps',
      count(*) filter (where p.id is not null and p.company_id <> c.company_id),
      count(*) filter (where c.tire_id is not null and p.id is null),
      count(*) filter (where c.company_id is null or c.tire_id is null)
    from public.tire_recaps c
    left join public.tires p on p.id = c.tire_id
    union all
    select 'tire_inspections',
      count(*) filter (where p.id is not null and p.company_id <> c.company_id),
      count(*) filter (where c.tire_id is not null and p.id is null),
      count(*) filter (where c.company_id is null or c.tire_id is null)
    from public.tire_inspections c
    left join public.tires p on p.id = c.tire_id
    union all
    select 'tire_movements',
      count(*) filter (where p.id is not null and p.company_id <> c.company_id),
      count(*) filter (where c.tire_id is not null and p.id is null),
      count(*) filter (where c.company_id is null or c.tire_id is null)
    from public.tire_movements c
    left join public.tires p on p.id = c.tire_id
  ) checks
  where cross_company + orphans + null_keys > 0;

  if v_report is not null then
    raise exception 'migration 101: registros filhos com vínculo inválido ao pai: %', v_report
      using hint = 'Nenhuma linha foi alterada. Corrija ou remova essas linhas antes de aplicar a migration 101.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. FKs compostas filho → pai
-- ---------------------------------------------------------------------------
-- ON DELETE CASCADE preserva o comportamento das FKs simples substituídas;
-- as FKs compostas não usam SET NULL, então company_id nunca é anulado.

alter table public.customer_contracts
  add constraint customer_contracts_company_id_id_key unique (company_id, id);

alter table public.maintenance_records
  add constraint maintenance_records_company_id_id_key unique (company_id, id);

alter table public.tires
  add constraint tires_company_id_id_key unique (company_id, id);

alter table public.customer_contract_items
  drop constraint if exists customer_contract_items_contract_id_fkey;

alter table public.customer_contract_items
  add constraint customer_contract_items_contract_company_fkey
  foreign key (company_id, contract_id)
  references public.customer_contracts (company_id, id)
  on delete cascade;

alter table public.maintenance_parts
  drop constraint if exists maintenance_parts_maintenance_record_id_fkey;

alter table public.maintenance_parts
  add constraint maintenance_parts_record_company_fkey
  foreign key (company_id, maintenance_record_id)
  references public.maintenance_records (company_id, id)
  on delete cascade;

alter table public.maintenance_services
  drop constraint if exists maintenance_services_maintenance_record_id_fkey;

alter table public.maintenance_services
  add constraint maintenance_services_record_company_fkey
  foreign key (company_id, maintenance_record_id)
  references public.maintenance_records (company_id, id)
  on delete cascade;

alter table public.tire_recaps
  drop constraint if exists tire_recaps_tire_id_fkey;

alter table public.tire_recaps
  add constraint tire_recaps_tire_company_fkey
  foreign key (company_id, tire_id)
  references public.tires (company_id, id)
  on delete cascade;

alter table public.tire_inspections
  drop constraint if exists tire_inspections_tire_id_fkey;

alter table public.tire_inspections
  add constraint tire_inspections_tire_company_fkey
  foreign key (company_id, tire_id)
  references public.tires (company_id, id)
  on delete cascade;

alter table public.tire_movements
  drop constraint if exists tire_movements_tire_id_fkey;

alter table public.tire_movements
  add constraint tire_movements_tire_company_fkey
  foreign key (company_id, tire_id)
  references public.tires (company_id, id)
  on delete cascade;

-- ---------------------------------------------------------------------------
-- 3. Funções de trigger restritas à empresa do filho
-- ---------------------------------------------------------------------------
-- CREATE OR REPLACE mantém owner e grants (inclusive o revoke da 096 em
-- refresh_tire_metrics). Se um vínculo cruzado escapar da FK, a função não
-- encontra o pai e não grava nada nele.

create or replace function public.sync_customer_contract_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_contract_id uuid;
  v_total numeric(14, 2);
begin
  v_company_id := coalesce(new.company_id, old.company_id);
  v_contract_id := coalesce(new.contract_id, old.contract_id);

  select coalesce(sum(coalesce(freight_value, 0)), 0)
  into v_total
  from public.customer_contract_items
  where contract_id = v_contract_id
    and company_id = v_company_id
    and deleted_at is null;

  update public.customer_contracts
  set contracted_revenue = v_total,
      updated_at = timezone('utc', now())
  where id = v_contract_id
    and company_id = v_company_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.recalculate_maintenance_costs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_record_id uuid;
  v_parts_total numeric(14, 2);
  v_services_total numeric(14, 2);
  v_total_cost numeric(14, 2);
  v_odometer_km numeric(12, 2);
  v_cost_per_km numeric(12, 4);
begin
  v_company_id := coalesce(new.company_id, old.company_id);
  v_record_id := coalesce(new.maintenance_record_id, old.maintenance_record_id);

  select coalesce(sum(total_price), 0)
  into v_parts_total
  from public.maintenance_parts
  where maintenance_record_id = v_record_id
    and company_id = v_company_id
    and deleted_at is null;

  select coalesce(sum(amount), 0)
  into v_services_total
  from public.maintenance_services
  where maintenance_record_id = v_record_id
    and company_id = v_company_id
    and deleted_at is null;

  v_total_cost := v_parts_total + v_services_total;

  select odometer_km into v_odometer_km
  from public.maintenance_records
  where id = v_record_id
    and company_id = v_company_id;

  if v_odometer_km is not null and v_odometer_km > 0 then
    v_cost_per_km := round(v_total_cost / v_odometer_km, 4);
  else
    v_cost_per_km := null;
  end if;

  update public.maintenance_records
  set
    parts_total = v_parts_total,
    services_total = v_services_total,
    total_cost = v_total_cost,
    cost_per_km = v_cost_per_km,
    final_amount = case when final_amount is null then v_total_cost else final_amount end
  where id = v_record_id
    and company_id = v_company_id;

  return coalesce(new, old);
end;
$$;

-- O histórico usa o company_id do pai; com o filtro, pai de outra empresa
-- vira company_id nulo e o NOT NULL de maintenance_history aborta o comando.
create or replace function public.log_maintenance_parts_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.maintenance_records%rowtype;
begin
  select * into v_record
  from public.maintenance_records
  where id = coalesce(new.maintenance_record_id, old.maintenance_record_id)
    and company_id = coalesce(new.company_id, old.company_id);

  insert into public.maintenance_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    maintenance_record_id, action, changes, created_by
  )
  values (
    v_record.company_id, v_record.branch_id, v_record.vehicle_id,
    v_record.driver_id, v_record.trip_id,
    v_record.id,
    case tg_op when 'INSERT' then 'parts_add' when 'UPDATE' then 'parts_update' else 'parts_delete' end,
    jsonb_build_object(
      'part_name', coalesce(new.name, old.name),
      'quantity', coalesce(new.quantity, old.quantity),
      'total_price', coalesce(new.total_price, old.total_price)
    ),
    coalesce(new.created_by, new.updated_by, old.updated_by)
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.log_maintenance_services_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record public.maintenance_records%rowtype;
begin
  select * into v_record
  from public.maintenance_records
  where id = coalesce(new.maintenance_record_id, old.maintenance_record_id)
    and company_id = coalesce(new.company_id, old.company_id);

  insert into public.maintenance_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    maintenance_record_id, action, changes, created_by
  )
  values (
    v_record.company_id, v_record.branch_id, v_record.vehicle_id,
    v_record.driver_id, v_record.trip_id,
    v_record.id,
    case tg_op when 'INSERT' then 'services_add' when 'UPDATE' then 'services_update' else 'services_delete' end,
    jsonb_build_object(
      'description', coalesce(new.description, old.description),
      'amount', coalesce(new.amount, old.amount)
    ),
    coalesce(new.created_by, new.updated_by, old.updated_by)
  );
  return coalesce(new, old);
end;
$$;

-- Métricas derivadas só de recapagens e inspeções da mesma empresa do pneu.
create or replace function public.refresh_tire_metrics(p_tire_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_recap_count integer;
  v_total_recap_cost numeric;
  v_purchase_value numeric;
  v_accumulated_km numeric;
  v_expected_life_km numeric;
  v_remaining_life_km numeric;
  v_cost_per_km numeric;
  v_last_tread numeric;
begin
  select company_id, purchase_value, accumulated_km, expected_life_km
  into v_company_id, v_purchase_value, v_accumulated_km, v_expected_life_km
  from public.tires
  where id = p_tire_id;

  if v_company_id is null then
    return;
  end if;

  select count(*)::int, coalesce(sum(amount), 0)
  into v_recap_count, v_total_recap_cost
  from public.tire_recaps
  where tire_id = p_tire_id
    and company_id = v_company_id
    and deleted_at is null;

  if v_expected_life_km is not null then
    v_remaining_life_km := greatest(v_expected_life_km - coalesce(v_accumulated_km, 0), 0);
  else
    v_remaining_life_km := null;
  end if;

  if coalesce(v_accumulated_km, 0) > 0 then
    v_cost_per_km := round(
      (coalesce(v_purchase_value, 0) + coalesce(v_total_recap_cost, 0)) / v_accumulated_km,
      4
    );
  else
    v_cost_per_km := null;
  end if;

  select tread_depth_mm
  into v_last_tread
  from public.tire_inspections
  where tire_id = p_tire_id
    and company_id = v_company_id
    and deleted_at is null
  order by inspected_at desc
  limit 1;

  update public.tires
  set
    recap_count = v_recap_count,
    total_recap_cost = v_total_recap_cost,
    remaining_life_km = v_remaining_life_km,
    cost_per_km = v_cost_per_km,
    last_tread_depth_mm = v_last_tread,
    tire_status = case
      when v_recap_count > 0 and tire_status = 'in_stock' then 'in_retread'::public.tire_status
      else tire_status
    end
  where id = p_tire_id
    and company_id = v_company_id;
end;
$$;

create or replace function public.log_tire_recap_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.tire_history (
      company_id, branch_id, vehicle_id, maintenance_record_id,
      tire_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
      new.tire_id, 'recap',
      jsonb_build_object(
        'supplier', new.supplier,
        'recap_number', new.recap_number,
        'amount', new.amount,
        'recapped_at', new.recapped_at
      ),
      new.created_by
    );
    if exists (
      select 1 from public.tires
      where id = new.tire_id and company_id = new.company_id
    ) then
      perform public.refresh_tire_metrics(new.tire_id);
    end if;
    update public.tires
    set tire_status = 'in_retread', updated_by = new.created_by
    where id = new.tire_id
      and company_id = new.company_id
      and tire_status not in ('discarded', 'installed');
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.log_tire_inspection_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.tire_history (
      company_id, branch_id, vehicle_id, maintenance_record_id,
      tire_id, action, changes, created_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
      new.tire_id, 'inspection',
      jsonb_build_object(
        'tread_depth_mm', new.tread_depth_mm,
        'pressure_psi', new.pressure_psi,
        'wear_level', new.wear_level,
        'inspected_at', new.inspected_at
      ),
      new.created_by
    );
    if exists (
      select 1 from public.tires
      where id = new.tire_id and company_id = new.company_id
    ) then
      perform public.refresh_tire_metrics(new.tire_id);
    end if;
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.tire_recaps_refresh_metrics()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.tires
    where id = coalesce(new.tire_id, old.tire_id)
      and company_id = coalesce(new.company_id, old.company_id)
  ) then
    perform public.refresh_tire_metrics(coalesce(new.tire_id, old.tire_id));
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function public.log_tire_movement_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_tire public.tires%rowtype;
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  select * into v_tire
  from public.tires
  where id = new.tire_id
    and company_id = new.company_id;

  v_action := case new.movement_type
    when 'install' then 'install'
    when 'remove' then 'remove'
    when 'position_change' then 'position_change'
    when 'rotation' then 'rotation'
    else 'movement'
  end;

  insert into public.tire_history (
    company_id, branch_id, vehicle_id, maintenance_record_id,
    tire_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.vehicle_id, new.maintenance_record_id,
    new.tire_id, v_action,
    jsonb_build_object(
      'movement_type', new.movement_type,
      'position', new.position,
      'vehicle_id', new.vehicle_id,
      'installed_at', new.installed_at,
      'removed_at', new.removed_at,
      'reason', new.reason,
      'responsible', new.responsible
    ),
    coalesce(new.created_by, new.updated_by)
  );

  if new.movement_type = 'install' and new.deleted_at is null then
    update public.tires
    set
      vehicle_id = new.vehicle_id,
      current_position = new.position,
      tire_status = 'installed',
      branch_id = coalesce(new.branch_id, v_tire.branch_id),
      maintenance_record_id = coalesce(new.maintenance_record_id, v_tire.maintenance_record_id),
      updated_by = new.created_by
    where id = new.tire_id
      and company_id = new.company_id;
  elsif new.movement_type = 'remove' and new.deleted_at is null then
    update public.tires
    set
      vehicle_id = null,
      current_position = null,
      tire_status = 'in_stock',
      updated_by = new.created_by
    where id = new.tire_id
      and company_id = new.company_id;
  elsif new.movement_type in ('position_change', 'rotation') and new.deleted_at is null then
    update public.tires
    set
      vehicle_id = coalesce(new.vehicle_id, v_tire.vehicle_id),
      current_position = new.position,
      updated_by = new.created_by
    where id = new.tire_id
      and company_id = new.company_id;
  end if;

  return new;
end;
$$;
