-- FleetControl — teste comportamental das migrations 109 e 110 (Fase 1, Etapa 1)
-- Rodar SOMENTE em banco local com as migrations aplicadas, como superusuário.
-- Tudo roda numa transação desfeita no fim; nenhum dado permanece.
--
-- Cobre:
--   - trip_financial_summary para quem tem financeiro:read (valores) e para
--     quem só tem trips:read (custos, resultado e título NULL, nunca zero);
--   - isolamento por empresa e bloqueio do anon;
--   - índice único por origem e parcela (109);
--   - get_financial_stats: adiantamento fora do resultado, dentro do caixa.

begin;

create temp table _e1_results (
  seq     serial,
  name    text not null,
  ok      boolean not null,
  detail  text
);
grant all on _e1_results to authenticated;
grant all on sequence _e1_results_seq_seq to authenticated;

create function pg_temp.expect(p_name text, p_ok boolean, p_detail text default null)
returns void
language sql
as $$
  insert into pg_temp._e1_results (name, ok, detail)
  values (p_name, coalesce(p_ok, false), p_detail);
$$;

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

create function pg_temp.error_of(p_sql text)
returns text
language plpgsql
as $$
begin
  execute p_sql;
  return null;
exception when others then
  return sqlerrm;
end;
$$;

create function pg_temp.add_member(p_company uuid, p_profile uuid, p_role text, p_perms text[])
returns void
language plpgsql
as $$
declare
  v_role uuid;
begin
  insert into public.roles (company_id, name)
  values (p_company, p_role)
  returning id into v_role;

  insert into public.role_permissions (role_id, permission_id, company_id)
  select v_role, p.id, p_company
  from public.permissions p
  where p.code = any (p_perms);

  insert into public.company_members (company_id, profile_id, role_id)
  values (p_company, p_profile, v_role);
end;
$$;

-- Empresas, usuários e permissões
insert into auth.users (id, email, raw_user_meta_data)
values
  ('e1100000-0000-4000-8000-000000000001', 'op@e1.test',  '{"full_name": "Só viagens"}'),
  ('e1200000-0000-4000-8000-000000000001', 'fin@e1.test', '{"full_name": "Financeiro"}'),
  ('e1300000-0000-4000-8000-000000000001', 'b@e1.test',   '{"full_name": "Financeiro B"}');

insert into public.companies (id, legal_name, tax_id, slug, email)
values
  ('ea000000-0000-4000-8000-000000000001', 'Empresa E1 A', 'E1-TAX-A', 'e1-empresa-a', 'a@e1.test'),
  ('eb000000-0000-4000-8000-000000000001', 'Empresa E1 B', 'E1-TAX-B', 'e1-empresa-b', 'b@e1.test');

-- Usuário com trips:read e SEM financeiro:read.
select pg_temp.add_member(
  'ea000000-0000-4000-8000-000000000001', 'e1100000-0000-4000-8000-000000000001', 'E1 Viagens',
  array['trips:read', 'trips:create', 'trips:update', 'customers:read']);
select pg_temp.add_member(
  'ea000000-0000-4000-8000-000000000001', 'e1200000-0000-4000-8000-000000000001', 'E1 Financeiro',
  array['financeiro:read', 'financeiro:create', 'financeiro:update', 'trips:read']);
select pg_temp.add_member(
  'eb000000-0000-4000-8000-000000000001', 'e1300000-0000-4000-8000-000000000001', 'E1 Financeiro B',
  array['financeiro:read', 'trips:read']);

insert into public.customers (id, company_id, legal_name, trade_name)
values ('ec000000-0000-4000-8000-000000000001', 'ea000000-0000-4000-8000-000000000001', 'Cliente E1 SA', 'Cliente E1');

-- Viagem concluída (frete 10.000, título a prazo) e viagem programada (frete 5.000).
select pg_temp.act_as('e1100000-0000-4000-8000-000000000001');
insert into public.trips (
  id, company_id, trip_number, customer_id, actual_freight_value,
  payment_condition, payment_issue_date, payment_due_date
)
values (
  'ed000000-0000-4000-8000-000000000001', 'ea000000-0000-4000-8000-000000000001', 'E1-001',
  'ec000000-0000-4000-8000-000000000001', 10000, 'term', date '2026-11-01', date '2026-12-01'
);
insert into public.trips (id, company_id, trip_number, customer_id, contracted_freight_value)
values (
  'ed000000-0000-4000-8000-000000000002', 'ea000000-0000-4000-8000-000000000001', 'E1-002',
  'ec000000-0000-4000-8000-000000000001', 5000
);
insert into public.trip_expenses (company_id, trip_id, expense_type, amount, expense_date)
values
  ('ea000000-0000-4000-8000-000000000001', 'ed000000-0000-4000-8000-000000000001', 'toll', 300, date '2026-11-02'),
  ('ea000000-0000-4000-8000-000000000001', 'ed000000-0000-4000-8000-000000000001', 'advance', 500, date '2026-11-02');
select pg_temp.act_as_owner();

update public.trips
set trip_status = 'completed', completed_at = now()
where id = 'ed000000-0000-4000-8000-000000000001';

-- Custos vinculados: abastecimento 2.000, um cancelado e um adiantamento.
insert into public.financial_entries (
  company_id, trip_id, entry_type, entry_status, amount, source_module, source_id, installment_number
)
values
  ('ea000000-0000-4000-8000-000000000001', 'ed000000-0000-4000-8000-000000000001', 'expense', 'paid', 2000,
   'fuel', 'ef000000-0000-4000-8000-000000000001', 1),
  ('ea000000-0000-4000-8000-000000000001', 'ed000000-0000-4000-8000-000000000001', 'expense', 'cancelled', 999,
   'fuel', 'ef000000-0000-4000-8000-000000000001', 1),
  ('ea000000-0000-4000-8000-000000000001', 'ed000000-0000-4000-8000-000000000001', 'advance', 'paid', 400,
   'driver_advance', 'ef000000-0000-4000-8000-000000000002', 1);

-- ---------------------------------------------------------------------------
-- Com financeiro:read
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e1200000-0000-4000-8000-000000000001');
select pg_temp.expect('financeiro vê frete, custo, resultado e margem da viagem concluída',
  (select financial_visible and freight_amount = 10000 and direct_costs = 2000
     and other_costs = 2000 and result = 8000 and margin_percent = 80
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));
select pg_temp.expect('adiantamento fica fora do custo e aparece à parte',
  (select advances_total = 400 and legacy_advance_expenses_amount = 500 and direct_costs = 2000
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));
select pg_temp.expect('despesa da aba sem lançamento aparece como pendente, fora do resultado',
  (select unposted_trip_expenses_amount = 300 and unposted_trip_expenses_count = 1
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));
select pg_temp.expect('financeiro vê a posição do título de frete',
  (select receivable_entry_id is not null and receivable_amount = 10000 and receivable_balance = 10000
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));

-- ---------------------------------------------------------------------------
-- Só trips:read (sem financeiro:read)
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e1100000-0000-4000-8000-000000000001');
select pg_temp.expect('sem financeiro, a viagem aparece com frete e sem acesso financeiro',
  (select not financial_visible and freight_amount = 10000
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));
select pg_temp.expect('sem financeiro, custos, resultado e margem são NULL (nunca zero nem frete)',
  (select direct_costs is null and fuel_costs is null and maintenance_costs is null
     and tire_costs is null and other_costs is null and direct_cost_entries is null
     and result is null and margin_percent is null
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));
select pg_temp.expect('sem financeiro, adiantamento, despesas sem lançamento e título são NULL',
  (select advances_total is null and reimbursements_total is null
     and unposted_trip_expenses_amount is null and unposted_trip_expenses_count is null
     and receivable_entry_id is null and receivable_status is null and receivable_amount is null
     and receivable_received is null and receivable_balance is null
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));
select pg_temp.expect('nenhuma linha sem financeiro traz resultado',
  not exists (select 1 from public.trip_financial_summary where result is not null));

-- ---------------------------------------------------------------------------
-- Isolamento e permissões
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e1300000-0000-4000-8000-000000000001');
select pg_temp.expect('outra empresa não enxerga as viagens da empresa A',
  not exists (select 1 from public.trip_financial_summary
              where company_id = 'ea000000-0000-4000-8000-000000000001'));

select pg_temp.act_as_owner();
select pg_temp.expect('anon não lê a view',
  not has_table_privilege('anon', 'public.trip_financial_summary', 'SELECT'));
select pg_temp.expect('authenticated só tem SELECT na view',
  has_table_privilege('authenticated', 'public.trip_financial_summary', 'SELECT')
  and not has_table_privilege('authenticated', 'public.trip_financial_summary', 'INSERT')
  and not has_table_privilege('authenticated', 'public.trip_financial_summary', 'UPDATE'));
select pg_temp.expect('superusuário (ignora RLS) conta como visível',
  (select financial_visible and result = 8000
   from public.trip_financial_summary where trip_id = 'ed000000-0000-4000-8000-000000000001'));

-- ---------------------------------------------------------------------------
-- Índice único por origem e parcela (109)
-- ---------------------------------------------------------------------------

select pg_temp.expect('segunda parcela ativa da mesma origem é recusada',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, entry_status, amount, source_module, source_id, installment_number)
    values ('ea000000-0000-4000-8000-000000000001', 'expense', 'pending', 1, 'fuel', 'ef000000-0000-4000-8000-000000000001', 1)
  $q$) like '%idx_financial_entries_source_installment_active%');
select pg_temp.expect('parcela vazia conta como parcela 1',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, entry_status, amount, source_module, source_id)
    values ('ea000000-0000-4000-8000-000000000001', 'expense', 'pending', 1, 'fuel', 'ef000000-0000-4000-8000-000000000001')
  $q$) like '%idx_financial_entries_source_installment_active%');
select pg_temp.expect('parcela 2 da mesma origem é aceita',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, entry_status, amount, source_module, source_id, installment_number)
    values ('ea000000-0000-4000-8000-000000000001', 'expense', 'pending', 1, 'fuel', 'ef000000-0000-4000-8000-000000000001', 2)
  $q$) is null);
-- Estorno exige o lançamento original (financial_entries_reversal_requires_original, 091).
select pg_temp.expect('estorno com a mesma origem é aceito',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, entry_status, amount, source_module, source_id, installment_number, reversed_entry_id)
    select 'ea000000-0000-4000-8000-000000000001', 'reversal', 'paid', 1, 'fuel', 'ef000000-0000-4000-8000-000000000001', 1, fe.id
    from public.financial_entries fe
    where fe.source_id = 'ef000000-0000-4000-8000-000000000001' and fe.entry_type = 'expense' and fe.entry_status = 'paid'
  $q$) is null);
select pg_temp.expect('mesma origem em outra empresa é aceita',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, entry_status, amount, source_module, source_id, installment_number)
    values ('eb000000-0000-4000-8000-000000000001', 'expense', 'pending', 1, 'fuel', 'ef000000-0000-4000-8000-000000000001', 1)
  $q$) is null);

-- ---------------------------------------------------------------------------
-- get_financial_stats: adiantamento é caixa, não resultado
-- ---------------------------------------------------------------------------

delete from public.financial_entries where company_id = 'eb000000-0000-4000-8000-000000000001';
insert into public.financial_entries (company_id, entry_type, entry_status, amount)
values
  ('eb000000-0000-4000-8000-000000000001', 'revenue', 'paid', 1000),
  ('eb000000-0000-4000-8000-000000000001', 'expense', 'paid', 300),
  ('eb000000-0000-4000-8000-000000000001', 'advance', 'paid', 200);

select pg_temp.expect('balance não desconta adiantamento',
  (public.get_financial_stats('eb000000-0000-4000-8000-000000000001') ->> 'balance')::numeric = 700);
select pg_temp.expect('cash_flow desconta o adiantamento pago',
  (public.get_financial_stats('eb000000-0000-4000-8000-000000000001') ->> 'cash_flow')::numeric = 500);
select pg_temp.expect('lucro operacional e despesas ignoram adiantamento',
  (public.get_financial_stats('eb000000-0000-4000-8000-000000000001') ->> 'operating_profit')::numeric = 700
  and (public.get_financial_stats('eb000000-0000-4000-8000-000000000001') ->> 'expenses')::numeric = 300);

select seq, name, ok, detail from _e1_results order by seq;

do $$
declare
  v_failed int;
begin
  select count(*) into v_failed from _e1_results where not ok;
  if v_failed > 0 then
    raise exception 'Casos reprovados: %', v_failed;
  end if;
end;
$$;

rollback;
