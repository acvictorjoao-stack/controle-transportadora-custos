-- FleetControl — medição de desempenho da reconciliação (Fase 2.1)
-- Rodar como dono do banco, com a 113 (ou 114) aplicada. Tudo é desfeito:
-- a transação termina numa exceção proposital com o resultado.
--
-- Monta uma empresa de teste com ~10x o volume da primeira-empresa e mede
-- financial_reconciliation_findings como um usuário do Financeiro (papel
-- authenticated, com a RLS de verdade), três vezes. O resultado sai na
-- mensagem da exceção: "bench <versão>: n=<achados> ms=<t1>/<t2>/<t3>".

begin;

set local statement_timeout = '120s';

create temp table _bench (label text, run int, findings int, ms int);
create temp table _bench_findings (label text, check_id text, severity text, entity_id uuid, reference text,
  expected numeric, actual numeric, reason text);
grant all on _bench, _bench_findings to authenticated;

create function pg_temp.act_as(p_user uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
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

-- Mede a função instalada como o usuário do Financeiro e guarda os achados da 1ª rodada.
create function pg_temp.bench(p_label text)
returns void
language plpgsql
as $$
declare
  v_t0 timestamptz;
  v_n int;
begin
  perform pg_temp.act_as('b2100000-0000-4000-8000-000000000001');
  for v_run in 1..3 loop
    v_t0 := clock_timestamp();
    select count(*) into v_n
    from public.financial_reconciliation_findings('b2a00000-0000-4000-8000-000000000001', null, null, null);
    insert into pg_temp._bench values (p_label, v_run, v_n,
      round(extract(epoch from clock_timestamp() - v_t0) * 1000));
  end loop;
  insert into pg_temp._bench_findings
  select p_label, f.check_id, f.severity, f.entity_id, f.reference, f.expected, f.actual, f.details ->> 'reason'
  from public.financial_reconciliation_findings('b2a00000-0000-4000-8000-000000000001', null, null, null) f;
  perform pg_temp.act_as_owner();
end;
$$;

-- ---------------------------------------------------------------------------
-- Empresa, usuário e volume
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values ('b2100000-0000-4000-8000-000000000001', 'fin@bench21.test', '{"full_name": "Financeiro Bench"}');

insert into public.companies (id, legal_name, tax_id, slug, email)
values ('b2a00000-0000-4000-8000-000000000001', 'Empresa Bench 21', 'BENCH-21', 'bench-21', 'bench@bench21.test');

with role_row as (
  insert into public.roles (company_id, name)
  values ('b2a00000-0000-4000-8000-000000000001', 'Bench Financeiro')
  returning id
), perms as (
  insert into public.role_permissions (role_id, permission_id, company_id)
  select r.id, p.id, 'b2a00000-0000-4000-8000-000000000001'
  from role_row r
  cross join public.permissions p
  where p.code in ('financeiro:read', 'fuel:read', 'maintenance:read', 'tires:read', 'trips:read',
                   'vehicles:read', 'drivers:read')
  returning role_id
)
insert into public.company_members (company_id, profile_id, role_id)
select 'b2a00000-0000-4000-8000-000000000001', 'b2100000-0000-4000-8000-000000000001', id from role_row;

insert into public.vehicles (id, company_id, plate, vehicle_type)
values ('b2a50000-0000-4000-8000-000000000001', 'b2a00000-0000-4000-8000-000000000001', 'BEN2A21', 'truck');

insert into public.drivers (id, company_id, name, cpf, cnh_number, license_category)
values ('b2a60000-0000-4000-8000-000000000001', 'b2a00000-0000-4000-8000-000000000001',
        'Motorista Bench', '00000000221', 'CNH-B21', 'E');

-- 500 viagens.
create temp table _trips as
select gen_random_uuid() as id, i from generate_series(1, 500) i;
insert into public.trips (id, company_id, trip_number, actual_freight_value)
select id, 'b2a00000-0000-4000-8000-000000000001', 'B21-' || i, 1000 + i from _trips;

-- 800 abastecimentos: 700 lançados certo, 50 com valor diferente (R05), 50 sem lançamento (R03).
create temp table _fuel as
select gen_random_uuid() as id, i from generate_series(1, 800) i;
insert into public.fuel_records (
  id, company_id, vehicle_id, driver_id, fuel_type, quantity_liters, price_per_liter, total_amount, fueled_at)
select id, 'b2a00000-0000-4000-8000-000000000001', 'b2a50000-0000-4000-8000-000000000001',
       'b2a60000-0000-4000-8000-000000000001', 'diesel', 10, 6, 60, '2026-10-15 12:00:00-03'
from _fuel;
insert into public.financial_entries (
  company_id, entry_type, entry_status, amount, paid_amount, paid_at, entry_date, description,
  source_module, source_id, fuel_record_id, installment_number)
select 'b2a00000-0000-4000-8000-000000000001', 'expense', 'paid',
       case when i > 700 then 55 else 60 end, case when i > 700 then 55 else 60 end,
       '2026-10-15 15:00:00+00', '2026-10-15', 'Bench abastecimento ' || i, 'fuel', id, id, 1
from _fuel where i <= 750;

-- 200 manutenções com lançamento pelo par de origem.
create temp table _maint as
select gen_random_uuid() as id, i from generate_series(1, 200) i;
insert into public.maintenance_records (id, company_id, vehicle_id, maintenance_type, total_cost, opened_at)
select id, 'b2a00000-0000-4000-8000-000000000001', 'b2a50000-0000-4000-8000-000000000001',
       'preventive', 300, '2026-10-10 12:00:00-03'
from _maint;
insert into public.financial_entries (
  company_id, entry_type, entry_status, amount, paid_amount, paid_at, entry_date, description,
  source_module, source_id, maintenance_record_id, installment_number)
select 'b2a00000-0000-4000-8000-000000000001', 'expense', 'paid', 300, 300, '2026-10-10 15:00:00+00',
       '2026-10-10', 'Bench manutenção ' || i, 'maintenance', id, id, 1
from _maint;

-- 2.000 despesas manuais em aberto com vencimento (valores distintos).
insert into public.financial_entries (
  company_id, entry_type, entry_status, amount, entry_date, due_date, description, supplier, source_module,
  installment_number)
select 'b2a00000-0000-4000-8000-000000000001', 'expense', 'pending', 100 + i * 0.01, '2026-10-20',
       '2026-11-20', 'Bench manual ' || i, 'Fornecedor ' || i, 'manual', 1
from generate_series(1, 2000) i;

-- Receita por viagem em 300 viagens; 20 delas com receita repetida (R10).
insert into public.financial_entries (
  company_id, entry_type, entry_status, amount, entry_date, due_date, description, client, source_module,
  installment_number, trip_id)
select 'b2a00000-0000-4000-8000-000000000001', 'revenue', 'pending', 1000 + t.i, '2026-10-20', '2026-11-30',
       'Bench receita ' || t.i || '-' || r, 'Cliente Bench', 'manual', 1, t.id
from _trips t
cross join generate_series(1, 2) r
where t.i <= 300 and (r = 1 or t.i <= 20);

-- @@medicao@@
select pg_temp.bench('instalada');

-- Com duas versões medidas ('113' e '114'), compara também os achados linha a linha.
do $$
declare
  v_summary text;
  v_diff int;
begin
  select string_agg(line, ' | ' order by label)
  into v_summary
  from (
    select label, format('bench %s: n=%s ms=%s', label, max(findings), string_agg(ms::text, '/' order by run)) as line
    from _bench
    group by label
  ) s;

  if (select count(distinct label) from _bench) = 2 then
    select count(*) into v_diff
    from (
      (select check_id, severity, entity_id, reference, expected, actual, reason from _bench_findings where label = '113'
       except all
       select check_id, severity, entity_id, reference, expected, actual, reason from _bench_findings where label = '114')
      union all
      (select check_id, severity, entity_id, reference, expected, actual, reason from _bench_findings where label = '114'
       except all
       select check_id, severity, entity_id, reference, expected, actual, reason from _bench_findings where label = '113')
    ) d;
    v_summary := v_summary || format(' | diferenças 113×114: %s', v_diff);
  end if;

  raise exception '%', v_summary;
end;
$$;

rollback;
