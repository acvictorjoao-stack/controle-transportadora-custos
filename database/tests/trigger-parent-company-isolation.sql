-- FleetControl — teste comportamental da migration 101 (A33-01)
-- Rodar SOMENTE em banco local com as migrations 001-101 aplicadas, como
-- superusuário (ex.: supabase start + psql -v ON_ERROR_STOP=1 -f <arquivo>).
-- Tudo roda numa transação desfeita no fim; nenhum dado permanece.
-- Falha de qualquer caso aborta com exceção depois de listar os resultados.

begin;

create temp table _a34_results (
  seq     serial,
  name    text not null,
  ok      boolean not null,
  detail  text
);

create function pg_temp.expect(p_name text, p_ok boolean, p_detail text default null)
returns void
language sql
as $$
  insert into pg_temp._a34_results (name, ok, detail)
  values (p_name, coalesce(p_ok, false), p_detail);
$$;

create function pg_temp.act_as(p_role text, p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', p_role)::text, true);
  perform set_config('role', p_role, true);
end;
$$;

create function pg_temp.act_as_owner()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

create function pg_temp.add_member(
  p_company uuid,
  p_profile uuid,
  p_role_name text,
  p_perms text[]
)
returns void
language plpgsql
as $$
declare
  v_role uuid;
  v_found int;
begin
  select id into v_role
  from public.roles
  where company_id = p_company and name = p_role_name and deleted_at is null;

  if v_role is null then
    insert into public.roles (company_id, name)
    values (p_company, p_role_name)
    returning id into v_role;

    insert into public.role_permissions (role_id, permission_id, company_id)
    select v_role, p.id, p_company
    from public.permissions p
    where p.code = any (p_perms);

    get diagnostics v_found = row_count;
    if v_found <> cardinality(p_perms) then
      raise exception 'permissões ausentes no catálogo: %', p_perms;
    end if;
  end if;

  insert into public.company_members (company_id, profile_id, role_id)
  values (p_company, p_profile, v_role);
end;
$$;

-- Empresas A/B, usuários e papéis
-- uA:  operador só na A (sem customers:update, sem *:delete)
-- uX:  operador na A e somente leitura na B (conhece UUIDs da B)
-- uAB: operador com update nas duas empresas
-- uC:  sem vínculo com nenhuma empresa

insert into auth.users (id, email, raw_user_meta_data)
values
  ('a1000000-0000-4000-8000-000000000001', 'ua@a34.test',  '{"full_name": "Usuario A"}'),
  ('a2000000-0000-4000-8000-000000000001', 'ux@a34.test',  '{"full_name": "Usuario X"}'),
  ('ab000000-0000-4000-8000-000000000001', 'uab@a34.test', '{"full_name": "Usuario AB"}'),
  ('c0000000-0000-4000-8000-000000000001', 'uc@a34.test',  '{"full_name": "Usuario C"}');

insert into public.companies (id, legal_name, tax_id, slug, email)
values
  ('a0000000-0000-4000-8000-000000000001', 'Empresa A34 A', 'A34-TAX-A', 'a34-empresa-a', 'a@a34.test'),
  ('b0000000-0000-4000-8000-000000000001', 'Empresa A34 B', 'A34-TAX-B', 'a34-empresa-b', 'b@a34.test');

select pg_temp.add_member(
  'a0000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'A34 Operador',
  array['customers:read', 'customers:create', 'maintenance:read', 'maintenance:update', 'tires:read', 'tires:update']);
select pg_temp.add_member(
  'a0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'A34 Operador',
  array['customers:read', 'customers:create', 'maintenance:read', 'maintenance:update', 'tires:read', 'tires:update']);
select pg_temp.add_member(
  'b0000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001', 'A34 Consulta',
  array['customers:read', 'maintenance:read', 'tires:read']);
select pg_temp.add_member(
  'a0000000-0000-4000-8000-000000000001', 'ab000000-0000-4000-8000-000000000001', 'A34 Gestor',
  array['customers:read', 'customers:create', 'customers:update', 'maintenance:read', 'maintenance:update', 'tires:read', 'tires:update']);
select pg_temp.add_member(
  'b0000000-0000-4000-8000-000000000001', 'ab000000-0000-4000-8000-000000000001', 'A34 Gestor',
  array['customers:read', 'customers:create', 'customers:update', 'maintenance:read', 'maintenance:update', 'tires:read', 'tires:update']);

-- Registros pai: contrato, manutenção e pneu em cada empresa

insert into public.customers (id, company_id, legal_name)
values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Cliente A'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Cliente B');

insert into public.customer_contracts (id, company_id, customer_id, contract_number)
values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'A34-A-1'),
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001', 'A34-B-1');

insert into public.customer_contract_items (id, company_id, contract_id, freight_value)
values ('b8000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 1000);

insert into public.vehicles (id, company_id, plate, vehicle_type)
values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'AAA1A11', 'truck'),
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'BBB1B11', 'truck');

insert into public.maintenance_records (id, company_id, vehicle_id, maintenance_type, odometer_km)
values
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000001', 'preventive', 1000),
  ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b5000000-0000-4000-8000-000000000001', 'preventive', 1000);

insert into public.maintenance_parts (id, company_id, maintenance_record_id, name, quantity, unit_price, total_price)
values ('b9000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'Filtro B', 1, 500, 500);

insert into public.tires (id, company_id, purchase_value, accumulated_km, expected_life_km)
values
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 1000, 10000, 100000),
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 2000, 20000, 100000);

-- Estado observável da empresa B: linhas pai (ctid muda em qualquer UPDATE)
-- e volume de histórico gravado na B.
create function pg_temp.b_state()
returns jsonb
language sql
as $$
  select jsonb_build_object(
    'contract', (select jsonb_build_object('ctid', c.ctid::text, 'row', to_jsonb(c))
                 from public.customer_contracts c where c.id = 'b4000000-0000-4000-8000-000000000001'),
    'record',   (select jsonb_build_object('ctid', m.ctid::text, 'row', to_jsonb(m))
                 from public.maintenance_records m where m.id = 'b6000000-0000-4000-8000-000000000001'),
    'tire',     (select jsonb_build_object('ctid', t.ctid::text, 'row', to_jsonb(t))
                 from public.tires t where t.id = 'b7000000-0000-4000-8000-000000000001'),
    'customer_history',    (select count(*) from public.customer_history    where company_id = 'b0000000-0000-4000-8000-000000000001'),
    'maintenance_history', (select count(*) from public.maintenance_history where company_id = 'b0000000-0000-4000-8000-000000000001'),
    'tire_history',        (select count(*) from public.tire_history        where company_id = 'b0000000-0000-4000-8000-000000000001')
  );
$$;

select pg_temp.expect(
  '0.1 setup: contrato B soma o item próprio (1000)',
  (select contracted_revenue = 1000 from public.customer_contracts where id = 'b4000000-0000-4000-8000-000000000001'));
select pg_temp.expect(
  '0.2 setup: manutenção B soma a peça própria (500)',
  (select parts_total = 500 and total_cost = 500 from public.maintenance_records where id = 'b6000000-0000-4000-8000-000000000001'));

create temp table _b_snapshot as select pg_temp.b_state() as s;

-- ---------------------------------------------------------------------------
-- 1. Operação válida na mesma empresa (uA, sem update no pai)
-- ---------------------------------------------------------------------------

do $$
declare
  v_rows int;
begin
  perform pg_temp.act_as('authenticated', 'a1000000-0000-4000-8000-000000000001');

  insert into public.customer_contract_items (id, company_id, contract_id, freight_value)
  values ('a8000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 300);

  insert into public.maintenance_parts (id, company_id, maintenance_record_id, name, quantity, unit_price, total_price)
  values ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'Filtro A', 1, 200, 200);

  insert into public.maintenance_services (company_id, maintenance_record_id, description, amount)
  values ('a0000000-0000-4000-8000-000000000001', 'a6000000-0000-4000-8000-000000000001', 'Mão de obra A', 100);

  insert into public.tire_recaps (id, company_id, tire_id, amount)
  values ('aa000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 50);

  insert into public.tire_inspections (company_id, tire_id, tread_depth_mm)
  values ('a0000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 7.5);

  insert into public.tire_movements (company_id, tire_id, vehicle_id, movement_type, position)
  values ('a0000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001',
          'a5000000-0000-4000-8000-000000000001', 'install', 'front_left');

  -- Sem customers:update a RLS não deixa uA gravar no contrato diretamente.
  update public.customer_contracts set contracted_revenue = 1
  where id = 'a4000000-0000-4000-8000-000000000001';
  get diagnostics v_rows = row_count;

  perform pg_temp.act_as_owner();

  perform pg_temp.expect('1.1 item de contrato recalcula receita do contrato A',
    (select contracted_revenue = 300 from public.customer_contracts where id = 'a4000000-0000-4000-8000-000000000001'));
  perform pg_temp.expect('1.2 peça e serviço recalculam custos da manutenção A',
    (select parts_total = 200 and services_total = 100 and total_cost = 300 and cost_per_km = 0.3
     from public.maintenance_records where id = 'a6000000-0000-4000-8000-000000000001'));
  perform pg_temp.expect('1.3 histórico de peça/serviço gravado na empresa A',
    (select count(*) = 2 from public.maintenance_history
     where company_id = 'a0000000-0000-4000-8000-000000000001'
       and maintenance_record_id = 'a6000000-0000-4000-8000-000000000001'
       and action in ('parts_add', 'services_add')));
  perform pg_temp.expect('1.4 recapagem e inspeção atualizam métricas do pneu A',
    (select recap_count = 1 and total_recap_cost = 50 and cost_per_km = 0.105 and last_tread_depth_mm = 7.5
     from public.tires where id = 'a7000000-0000-4000-8000-000000000001'));
  perform pg_temp.expect('1.5 movimentação instala o pneu A no veículo A',
    (select tire_status = 'installed' and vehicle_id = 'a5000000-0000-4000-8000-000000000001'
     from public.tires where id = 'a7000000-0000-4000-8000-000000000001'));
  perform pg_temp.expect('1.6 sem customers:update o UPDATE direto no contrato não afeta linhas',
    v_rows = 0, format('linhas: %s', v_rows));
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Vincular registro da empresa A a pai da empresa B (uA, só na A)
-- ---------------------------------------------------------------------------

do $$
declare
  v_case record;
  v_state text;
begin
  for v_case in
    select * from (values
      ('2.1 item A -> contrato B',
       $q$insert into public.customer_contract_items (company_id, contract_id, freight_value)
          values ('a0000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 99999)$q$),
      ('2.2 peça A -> manutenção B',
       $q$insert into public.maintenance_parts (company_id, maintenance_record_id, name, quantity, unit_price, total_price)
          values ('a0000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'X', 1, 99999, 99999)$q$),
      ('2.3 serviço A -> manutenção B',
       $q$insert into public.maintenance_services (company_id, maintenance_record_id, description, amount)
          values ('a0000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'X', 99999)$q$),
      ('2.4 recapagem A -> pneu B',
       $q$insert into public.tire_recaps (company_id, tire_id, amount)
          values ('a0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 99999)$q$),
      ('2.5 inspeção A -> pneu B',
       $q$insert into public.tire_inspections (company_id, tire_id, tread_depth_mm)
          values ('a0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 0.1)$q$),
      ('2.6 movimentação A instala pneu B no veículo A',
       $q$insert into public.tire_movements (company_id, tire_id, vehicle_id, movement_type, position)
          values ('a0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001',
                  'a5000000-0000-4000-8000-000000000001', 'install', 'front_left')$q$)
    ) as t(name, stmt)
  loop
    perform pg_temp.act_as('authenticated', 'a1000000-0000-4000-8000-000000000001');
    begin
      execute v_case.stmt;
      v_state := '00000';
    exception when others then
      v_state := sqlstate;
    end;
    perform pg_temp.act_as_owner();
    perform pg_temp.expect(v_case.name || ': rejeitado por FK composta', v_state = '23503', v_state);
  end loop;

  perform pg_temp.expect('2.7 empresa B intacta após as tentativas',
    pg_temp.b_state() = (select s from pg_temp._b_snapshot));
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Filho em empresa diferente da do pai (uAB, permissão nas duas)
-- ---------------------------------------------------------------------------

do $$
declare
  v_case record;
  v_state text;
begin
  for v_case in
    select * from (values
      ('3.1 INSERT item company_id=B em contrato A',
       $q$insert into public.customer_contract_items (company_id, contract_id, freight_value)
          values ('b0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 99999)$q$),
      ('3.2 UPDATE item A trocando company_id para B',
       $q$update public.customer_contract_items set company_id = 'b0000000-0000-4000-8000-000000000001'
          where id = 'a8000000-0000-4000-8000-000000000001'$q$),
      ('3.3 UPDATE item A trocando contract_id para contrato B',
       $q$update public.customer_contract_items set contract_id = 'b4000000-0000-4000-8000-000000000001'
          where id = 'a8000000-0000-4000-8000-000000000001'$q$),
      ('3.4 UPDATE peça A trocando manutenção para B',
       $q$update public.maintenance_parts set maintenance_record_id = 'b6000000-0000-4000-8000-000000000001'
          where id = 'a9000000-0000-4000-8000-000000000001'$q$),
      ('3.5 UPDATE recapagem A trocando pneu para B',
       $q$update public.tire_recaps set tire_id = 'b7000000-0000-4000-8000-000000000001'
          where id = 'aa000000-0000-4000-8000-000000000001'$q$),
      ('3.6 INSERT movimentação company_id=B para pneu A',
       $q$insert into public.tire_movements (company_id, tire_id, movement_type)
          values ('b0000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'remove')$q$)
    ) as t(name, stmt)
  loop
    perform pg_temp.act_as('authenticated', 'ab000000-0000-4000-8000-000000000001');
    begin
      execute v_case.stmt;
      v_state := '00000';
    exception when others then
      v_state := sqlstate;
    end;
    perform pg_temp.act_as_owner();
    perform pg_temp.expect(v_case.name || ': rejeitado por FK composta', v_state = '23503', v_state);
  end loop;

  perform pg_temp.expect('3.7 empresa B intacta',
    pg_temp.b_state() = (select s from pg_temp._b_snapshot));
  perform pg_temp.expect('3.8 contrato, manutenção e pneu A preservados',
    (select contracted_revenue = 300 from public.customer_contracts where id = 'a4000000-0000-4000-8000-000000000001')
    and (select total_cost = 300 from public.maintenance_records where id = 'a6000000-0000-4000-8000-000000000001')
    and (select recap_count = 1 and tire_status = 'installed' from public.tires where id = 'a7000000-0000-4000-8000-000000000001'));
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Usuário sem vínculo ou sem permissão
-- ---------------------------------------------------------------------------

do $$
declare
  v_case record;
  v_state text;
begin
  for v_case in
    select * from (values
      ('4.1 sem vínculo: item na empresa A', 'authenticated', 'c0000000-0000-4000-8000-000000000001'::uuid,
       $q$insert into public.customer_contract_items (company_id, contract_id, freight_value)
          values ('a0000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001', 99999)$q$),
      ('4.2 sem vínculo: recapagem na empresa A', 'authenticated', 'c0000000-0000-4000-8000-000000000001'::uuid,
       $q$insert into public.tire_recaps (company_id, tire_id, amount)
          values ('a0000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 99999)$q$),
      ('4.3 só leitura na B: item no contrato B', 'authenticated', 'a2000000-0000-4000-8000-000000000001'::uuid,
       $q$insert into public.customer_contract_items (company_id, contract_id, freight_value)
          values ('b0000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 99999)$q$),
      ('4.4 só leitura na B: peça na manutenção B', 'authenticated', 'a2000000-0000-4000-8000-000000000001'::uuid,
       $q$insert into public.maintenance_parts (company_id, maintenance_record_id, name, quantity, unit_price, total_price)
          values ('b0000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'X', 1, 99999, 99999)$q$),
      ('4.5 anon: movimentação no pneu B', 'anon', null::uuid,
       $q$insert into public.tire_movements (company_id, tire_id, movement_type)
          values ('b0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 'install')$q$),
      ('4.6 authenticated não executa refresh_tire_metrics', 'authenticated', 'a1000000-0000-4000-8000-000000000001'::uuid,
       $q$select public.refresh_tire_metrics('b7000000-0000-4000-8000-000000000001')$q$)
    ) as t(name, role_name, user_id, stmt)
  loop
    perform pg_temp.act_as(v_case.role_name, v_case.user_id);
    begin
      execute v_case.stmt;
      v_state := '00000';
    exception when others then
      v_state := sqlstate;
    end;
    perform pg_temp.act_as_owner();
    perform pg_temp.expect(v_case.name || ': negado (42501)', v_state = '42501', v_state);
  end loop;

  perform pg_temp.expect('4.7 empresa B intacta',
    pg_temp.b_state() = (select s from pg_temp._b_snapshot));
  perform pg_temp.expect('4.8 contrato A intacto',
    (select contracted_revenue = 300 from public.customer_contracts where id = 'a4000000-0000-4000-8000-000000000001'));
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Defesa em profundidade: sem as FKs compostas, os triggers não gravam
--    na empresa B. Tudo é desfeito por subtransação.
-- ---------------------------------------------------------------------------

do $$
declare
  v_before jsonb := pg_temp.b_state();
  v_after jsonb;
  v_part_state text;
  v_item_state text;
  v_tire_state text;
begin
  begin
    alter table public.customer_contract_items drop constraint customer_contract_items_contract_company_fkey;
    alter table public.maintenance_parts drop constraint maintenance_parts_record_company_fkey;
    alter table public.tire_recaps drop constraint tire_recaps_tire_company_fkey;
    alter table public.tire_inspections drop constraint tire_inspections_tire_company_fkey;
    alter table public.tire_movements drop constraint tire_movements_tire_company_fkey;

    perform pg_temp.act_as('authenticated', 'a1000000-0000-4000-8000-000000000001');

    begin
      insert into public.customer_contract_items (company_id, contract_id, freight_value)
      values ('a0000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 99999);
      v_item_state := '00000';
    exception when others then
      v_item_state := sqlstate;
    end;

    begin
      insert into public.maintenance_parts (company_id, maintenance_record_id, name, quantity, unit_price, total_price)
      values ('a0000000-0000-4000-8000-000000000001', 'b6000000-0000-4000-8000-000000000001', 'X', 1, 99999, 99999);
      v_part_state := '00000';
    exception when others then
      v_part_state := sqlstate;
    end;

    begin
      insert into public.tire_recaps (company_id, tire_id, amount)
      values ('a0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 99999);
      insert into public.tire_inspections (company_id, tire_id, tread_depth_mm)
      values ('a0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 0.1);
      insert into public.tire_movements (company_id, tire_id, vehicle_id, movement_type, position)
      values ('a0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001',
              'a5000000-0000-4000-8000-000000000001', 'install', 'front_left');
      v_tire_state := '00000';
    exception when others then
      v_tire_state := sqlstate;
    end;

    perform pg_temp.act_as_owner();
    v_after := pg_temp.b_state();
    raise exception using errcode = 'P0A34';
  exception when sqlstate 'P0A34' then
    null;
  end;

  perform pg_temp.expect('5.1 sem FK: item cruzado é gravado, mas receita do contrato B não muda',
    v_item_state = '00000' and v_after -> 'contract' = v_before -> 'contract', v_item_state);
  perform pg_temp.expect('5.2 sem FK: peça cruzada aborta (histórico sem pai da mesma empresa)',
    v_part_state = '23502' and v_after -> 'record' = v_before -> 'record', v_part_state);
  perform pg_temp.expect('5.3 sem FK: recapagem/inspeção/movimentação não tocam o pneu B',
    v_tire_state = '00000' and v_after -> 'tire' = v_before -> 'tire', v_tire_state);
  perform pg_temp.expect('5.4 sem FK: nenhum histórico criado na empresa B',
    v_after - 'contract' - 'record' - 'tire' = v_before - 'contract' - 'record' - 'tire');
  perform pg_temp.expect('5.5 FKs compostas restauradas após o rollback da subtransação',
    (select count(*) = 5 from pg_constraint
     where conname in (
       'customer_contract_items_contract_company_fkey', 'maintenance_parts_record_company_fkey',
       'tire_recaps_tire_company_fkey', 'tire_inspections_tire_company_fkey', 'tire_movements_tire_company_fkey')));
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. service_role e fluxos administrativos
-- ---------------------------------------------------------------------------

do $$
declare
  v_state text;
begin
  -- 6.1 service_role grava filho na própria empresa do pai e o recálculo roda.
  perform pg_temp.act_as('service_role', null);
  insert into public.customer_contract_items (company_id, contract_id, freight_value)
  values ('b0000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 250);
  insert into public.tire_recaps (company_id, tire_id, amount)
  values ('b0000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 100);
  perform pg_temp.act_as_owner();

  perform pg_temp.expect('6.1 service_role: item no contrato B recalcula receita (1250)',
    (select contracted_revenue = 1250 from public.customer_contracts where id = 'b4000000-0000-4000-8000-000000000001'));
  perform pg_temp.expect('6.2 service_role: recapagem no pneu B recalcula métricas',
    (select recap_count = 1 and total_recap_cost = 100 and tire_status = 'in_retread'
     from public.tires where id = 'b7000000-0000-4000-8000-000000000001'));

  -- 6.3 service_role (bypass de RLS) também não cruza empresas.
  perform pg_temp.act_as('service_role', null);
  begin
    insert into public.customer_contract_items (company_id, contract_id, freight_value)
    values ('a0000000-0000-4000-8000-000000000001', 'b4000000-0000-4000-8000-000000000001', 99999);
    v_state := '00000';
  exception when others then
    v_state := sqlstate;
  end;
  perform pg_temp.act_as_owner();
  perform pg_temp.expect('6.3 service_role: item A -> contrato B rejeitado', v_state = '23503', v_state);

  -- 6.4 Reset da DEMO (database/seeds/demo/reset-demo.ts): DELETE por
  -- company_id, filhos antes dos pais, via service_role.
  perform pg_temp.act_as('service_role', null);
  delete from public.maintenance_parts    where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.maintenance_services where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.maintenance_history  where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.maintenance_records  where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.tire_recaps          where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.tire_inspections     where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.tire_movements       where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.tire_history         where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.tires                where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.customer_history     where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.customer_contract_items where company_id = 'b0000000-0000-4000-8000-000000000001';
  delete from public.customer_contracts   where company_id = 'b0000000-0000-4000-8000-000000000001';
  perform pg_temp.act_as_owner();

  perform pg_temp.expect('6.4 reset por company_id remove a empresa B sem tocar a A',
    not exists (select 1 from public.customer_contracts where company_id = 'b0000000-0000-4000-8000-000000000001')
    and not exists (select 1 from public.maintenance_records where company_id = 'b0000000-0000-4000-8000-000000000001')
    and not exists (select 1 from public.tires where company_id = 'b0000000-0000-4000-8000-000000000001')
    and (select contracted_revenue = 300 from public.customer_contracts where id = 'a4000000-0000-4000-8000-000000000001')
    and (select total_cost = 300 from public.maintenance_records where id = 'a6000000-0000-4000-8000-000000000001'));

  -- 6.5 Hard delete do pai continua cascateando para os filhos (FK composta).
  delete from public.customer_contracts where id = 'a4000000-0000-4000-8000-000000000001';
  delete from public.tires where id = 'a7000000-0000-4000-8000-000000000001';
  perform pg_temp.expect('6.5 hard delete do contrato/pneu cascateia itens, recapagens, inspeções e movimentações',
    not exists (select 1 from public.customer_contract_items where contract_id = 'a4000000-0000-4000-8000-000000000001')
    and not exists (select 1 from public.tire_recaps where tire_id = 'a7000000-0000-4000-8000-000000000001')
    and not exists (select 1 from public.tire_inspections where tire_id = 'a7000000-0000-4000-8000-000000000001')
    and not exists (select 1 from public.tire_movements where tire_id = 'a7000000-0000-4000-8000-000000000001'));
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Catálogo: funções seguem SECURITY DEFINER com search_path fixo
-- ---------------------------------------------------------------------------

select pg_temp.expect(
  '7.1 ' || p.proname || ': security definer + search_path=public',
  p.prosecdef and p.proconfig = array['search_path=public'],
  coalesce(array_to_string(p.proconfig, ','), 'sem proconfig'))
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in (
    'sync_customer_contract_revenue', 'recalculate_maintenance_costs',
    'log_maintenance_parts_history', 'log_maintenance_services_history',
    'refresh_tire_metrics', 'log_tire_recap_history', 'log_tire_inspection_history',
    'tire_recaps_refresh_metrics', 'log_tire_movement_history');

select pg_temp.expect(
  '7.2 refresh_tire_metrics segue sem EXECUTE para anon/authenticated (096)',
  not has_function_privilege('anon', 'public.refresh_tire_metrics(uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.refresh_tire_metrics(uuid)', 'execute'));

-- ---------------------------------------------------------------------------
-- 8. Pré-checagem da 101: cópia literal do bloco da migration (o teste
--    estático exige que seja idêntica). Linhas inválidas são gravadas com
--    session_replication_role = replica (sem FKs nem triggers) dentro de
--    subtransação desfeita em seguida.
-- ---------------------------------------------------------------------------

create function pg_temp.run_101_precheck()
returns text
language plpgsql
as $fn$
begin
  execute $precheck$
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
$precheck$;
  return null;
exception when others then
  return format('%s: %s', sqlstate, sqlerrm);
end;
$fn$;

-- Pais da empresa A para os casos (os da seção 6 foram removidos).
insert into public.customer_contracts (id, company_id, customer_id, contract_number)
values ('a4000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'A34-A-2');

insert into public.tires (id, company_id, purchase_value, accumulated_km, expected_life_km)
values ('a7000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 1000, 10000, 100000);

-- Grava um filho de cada relação com (company_id, pai) informados, sem FKs nem triggers.
create function pg_temp.insert_raw_children(p_company uuid, p_contract uuid, p_record uuid, p_tire uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('session_replication_role', 'replica', true);
  insert into public.customer_contract_items (company_id, contract_id, freight_value)
  values (p_company, p_contract, 1);
  insert into public.maintenance_parts (company_id, maintenance_record_id, name, quantity, unit_price, total_price)
  values (p_company, p_record, 'X', 1, 1, 1);
  insert into public.maintenance_services (company_id, maintenance_record_id, description, amount)
  values (p_company, p_record, 'X', 1);
  insert into public.tire_recaps (company_id, tire_id, amount)
  values (p_company, p_tire, 1);
  insert into public.tire_inspections (company_id, tire_id, tread_depth_mm)
  values (p_company, p_tire, 1);
  insert into public.tire_movements (company_id, tire_id, movement_type)
  values (p_company, p_tire, 'remove');
  perform set_config('session_replication_role', 'origin', true);
end;
$$;

do $$
declare
  v_relations text[] := array[
    'customer_contract_items', 'maintenance_parts', 'maintenance_services',
    'tire_recaps', 'tire_inspections', 'tire_movements'];
  v_rel text;
  v_consistent text;
  v_cross text;
  v_orphan text;
  v_after text;
begin
  v_consistent := pg_temp.run_101_precheck();
  perform pg_temp.expect('8.1 dados consistentes: pré-checagem passa', v_consistent is null, v_consistent);

  -- Filhos com company_id B apontando para pais da empresa A.
  begin
    perform pg_temp.insert_raw_children(
      'b0000000-0000-4000-8000-000000000001',
      'a4000000-0000-4000-8000-000000000002',
      'a6000000-0000-4000-8000-000000000001',
      'a7000000-0000-4000-8000-000000000002');
    v_cross := pg_temp.run_101_precheck();
    raise exception using errcode = 'P0A35';
  exception when sqlstate 'P0A35' then
    null;
  end;

  -- Filhos da empresa A apontando para pais inexistentes.
  begin
    perform pg_temp.insert_raw_children(
      'a0000000-0000-4000-8000-000000000001',
      'dead0000-0000-4000-8000-000000000001',
      'dead0000-0000-4000-8000-000000000002',
      'dead0000-0000-4000-8000-000000000003');
    v_orphan := pg_temp.run_101_precheck();
    raise exception using errcode = 'P0A35';
  exception when sqlstate 'P0A35' then
    null;
  end;

  perform pg_temp.expect('8.2 vínculo cruzado: pré-checagem aborta (P0001)',
    v_cross like 'P0001: migration 101: registros filhos com vínculo inválido ao pai: %', v_cross);
  perform pg_temp.expect('8.3 filho órfão: pré-checagem aborta (P0001)',
    v_orphan like 'P0001: migration 101: registros filhos com vínculo inválido ao pai: %', v_orphan);

  foreach v_rel in array v_relations loop
    perform pg_temp.expect('8.2 vínculo cruzado detectado em ' || v_rel,
      position(v_rel || ' (outra empresa: 1, pai inexistente: 0, chave nula: 0)' in coalesce(v_cross, '')) > 0);
    perform pg_temp.expect('8.3 órfão detectado em ' || v_rel,
      position(v_rel || ' (outra empresa: 0, pai inexistente: 1, chave nula: 0)' in coalesce(v_orphan, '')) > 0);
  end loop;

  v_after := pg_temp.run_101_precheck();
  perform pg_temp.expect('8.4 após desfazer os casos a pré-checagem volta a passar', v_after is null, v_after);
  perform pg_temp.expect('8.5 session_replication_role restaurado',
    current_setting('session_replication_role') = 'origin');
end;
$$;

select seq, ok, name, detail from pg_temp._a34_results order by seq;

do $$
declare
  v_failed text;
begin
  select string_agg(name, '; ' order by seq) into v_failed
  from pg_temp._a34_results where not ok;

  if v_failed is not null then
    raise exception 'A34: casos com falha: %', v_failed;
  end if;
end;
$$;

rollback;
