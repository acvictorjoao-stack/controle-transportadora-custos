-- FleetControl — teste comportamental das migrations 113 e 114 (Fase 2.1, reconciliação)
-- Rodar com as migrations até a 114 aplicadas, como dono do banco.
-- Tudo roda numa transação desfeita no fim; nenhum dado permanece.
--
-- Monta uma empresa de teste com UM caso por verificação e confere que cada
-- verificação dispara uma vez e só uma vez. Cobre também: permissão
-- (financeiro:read), isolamento entre empresas, limite, período, resumo e
-- acesso (anon sem execução, security invoker).
--
-- Fora daqui, por exigirem desligar gatilhos da 107 (o teste não faz isso num
-- banco compartilhado): título de frete ausente (R03) e frete divergente (R05).
-- Esses dois casos ficam no teste de contrato estático.

begin;

create temp table _r21_results (
  seq     serial,
  name    text not null,
  ok      boolean not null,
  detail  text
);
grant all on _r21_results to authenticated;
grant all on sequence _r21_results_seq_seq to authenticated;

create function pg_temp.expect(p_name text, p_ok boolean, p_detail text default null)
returns void
language sql
as $$
  insert into pg_temp._r21_results (name, ok, detail)
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
  return sqlstate || ': ' || sqlerrm;
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

-- Achados da empresa A vistos pelo usuário do Financeiro, guardados para as conferências.
create temp table _r21_findings (
  check_id    text,
  severity    text,
  entity_type text,
  entity_id   uuid,
  reference   text,
  expected    numeric,
  actual      numeric,
  details     jsonb,
  legacy      boolean
);
grant all on _r21_findings to authenticated;

-- ---------------------------------------------------------------------------
-- Empresas, usuários e permissões
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values
  ('21100000-0000-4000-8000-000000000001', 'fin@r21.test', '{"full_name": "Financeiro A"}'),
  ('21200000-0000-4000-8000-000000000001', 'op@r21.test',  '{"full_name": "Só viagens A"}'),
  ('21300000-0000-4000-8000-000000000001', 'fin@r21b.test', '{"full_name": "Financeiro B"}'),
  ('21400000-0000-4000-8000-000000000001', 'finr@r21.test', '{"full_name": "Financeiro restrito A"}');

insert into public.companies (id, legal_name, tax_id, slug, email)
values
  ('21a00000-0000-4000-8000-000000000001', 'Empresa R21 A', 'R21-TAX-A', 'r21-empresa-a', 'a@r21.test'),
  ('21b00000-0000-4000-8000-000000000001', 'Empresa R21 B', 'R21-TAX-B', 'r21-empresa-b', 'b@r21.test');

select pg_temp.add_member(
  '21a00000-0000-4000-8000-000000000001', '21100000-0000-4000-8000-000000000001', 'R21 Financeiro',
  array['financeiro:read', 'fuel:read', 'trips:read', 'trips:create', 'trips:update']);
select pg_temp.add_member(
  '21a00000-0000-4000-8000-000000000001', '21200000-0000-4000-8000-000000000001', 'R21 Viagens',
  array['trips:read', 'trips:create', 'trips:update']);
select pg_temp.add_member(
  '21b00000-0000-4000-8000-000000000001', '21300000-0000-4000-8000-000000000001', 'R21 Financeiro B',
  array['financeiro:read', 'trips:read']);
-- Financeiro sem acesso a abastecimentos, viagens, veículos ou motoristas.
select pg_temp.add_member(
  '21a00000-0000-4000-8000-000000000001', '21400000-0000-4000-8000-000000000001', 'R21 Financeiro restrito',
  array['financeiro:read']);

-- ---------------------------------------------------------------------------
-- Cadastros
-- ---------------------------------------------------------------------------
insert into public.vehicles (id, company_id, plate, vehicle_type)
values ('21a50000-0000-4000-8000-000000000001', '21a00000-0000-4000-8000-000000000001', 'RCA1A21', 'truck');

insert into public.drivers (id, company_id, name, cpf, cnh_number, license_category)
values ('21a60000-0000-4000-8000-000000000001', '21a00000-0000-4000-8000-000000000001',
        'Motorista R21', '00000000021', 'CNH-R21', 'E');

insert into public.trips (id, company_id, trip_number, actual_freight_value)
values
  ('21ad0000-0000-4000-8000-000000000001', '21a00000-0000-4000-8000-000000000001', 'R21-T1', 8000),
  ('21ad0000-0000-4000-8000-000000000002', '21a00000-0000-4000-8000-000000000001', 'R21-T2', 9000),
  ('21bd0000-0000-4000-8000-000000000001', '21b00000-0000-4000-8000-000000000001', 'R21-B-T1', 4000);

-- Abastecimentos: F1 certo, F2 sem lançamento, F3 com valor diferente,
-- F4 excluído (lançamento órfão), F5 lançado no dia UTC (23h30 em Brasília).
insert into public.fuel_records (
  id, company_id, vehicle_id, driver_id, fuel_type, quantity_liters, price_per_liter, total_amount,
  fueled_at, deleted_at)
values
  ('21af0000-0000-4000-8000-000000000001', '21a00000-0000-4000-8000-000000000001',
   '21a50000-0000-4000-8000-000000000001', '21a60000-0000-4000-8000-000000000001',
   'diesel', 50, 6, 300, '2026-11-05 12:00:00-03', null),
  ('21af0000-0000-4000-8000-000000000002', '21a00000-0000-4000-8000-000000000001',
   '21a50000-0000-4000-8000-000000000001', '21a60000-0000-4000-8000-000000000001',
   'diesel', 40, 5, 200, '2026-11-05 12:00:00-03', null),
  ('21af0000-0000-4000-8000-000000000003', '21a00000-0000-4000-8000-000000000001',
   '21a50000-0000-4000-8000-000000000001', '21a60000-0000-4000-8000-000000000001',
   'diesel', 100, 5, 500, '2026-11-05 12:00:00-03', null),
  ('21af0000-0000-4000-8000-000000000004', '21a00000-0000-4000-8000-000000000001',
   '21a50000-0000-4000-8000-000000000001', '21a60000-0000-4000-8000-000000000001',
   'diesel', 10, 7, 70, '2026-11-05 12:00:00-03', '2026-11-06 10:00:00-03'),
  ('21af0000-0000-4000-8000-000000000005', '21a00000-0000-4000-8000-000000000001',
   '21a50000-0000-4000-8000-000000000001', '21a60000-0000-4000-8000-000000000001',
   'diesel', 20, 6, 120, '2026-11-05 23:30:00-03', null);

-- ---------------------------------------------------------------------------
-- Lançamentos (como dono: simula o que a aplicação gravou)
-- ---------------------------------------------------------------------------
insert into public.financial_entries (
  id, company_id, entry_type, entry_status, amount, paid_amount, paid_at, entry_date, due_date,
  description, supplier, client, source_module, source_id, fuel_record_id, installment_number,
  trip_id, reversed_entry_id)
values
  -- F1 certo (sem achado)
  ('21ae0000-0000-4000-8000-000000000001', '21a00000-0000-4000-8000-000000000001', 'expense', 'paid',
   300, 300, '2026-11-05 15:00:00+00', '2026-11-05', null, 'R21 abastecimento F1', null, null,
   'fuel', '21af0000-0000-4000-8000-000000000001', '21af0000-0000-4000-8000-000000000001', 1, null, null),
  -- F3 lançado por 450 (R05)
  ('21ae0000-0000-4000-8000-000000000003', '21a00000-0000-4000-8000-000000000001', 'expense', 'paid',
   450, 450, '2026-11-05 15:00:00+00', '2026-11-05', null, 'R21 abastecimento F3', null, null,
   'fuel', '21af0000-0000-4000-8000-000000000003', '21af0000-0000-4000-8000-000000000003', 1, null, null),
  -- F4 excluído com lançamento ativo (R04)
  ('21ae0000-0000-4000-8000-000000000004', '21a00000-0000-4000-8000-000000000001', 'expense', 'paid',
   70, 70, '2026-11-05 15:00:00+00', '2026-11-05', null, 'R21 abastecimento F4', null, null,
   'fuel', '21af0000-0000-4000-8000-000000000004', '21af0000-0000-4000-8000-000000000004', 1, null, null),
  -- F5 com a data UTC (R14)
  ('21ae0000-0000-4000-8000-000000000005', '21a00000-0000-4000-8000-000000000001', 'expense', 'paid',
   120, 120, '2026-11-06 02:30:00+00', '2026-11-06', null, 'R21 abastecimento F5', null, null,
   'fuel', '21af0000-0000-4000-8000-000000000005', '21af0000-0000-4000-8000-000000000005', 1, null, null),
  -- Possível duplicidade manual (R01 aviso): mesmo valor, data e fornecedor
  ('21ae0000-0000-4000-8000-000000000011', '21a00000-0000-4000-8000-000000000001', 'expense', 'pending',
   333.33, null, null, '2026-11-10', '2026-11-20', 'R21 manual 1', 'Fornecedor R21', null,
   'manual', null, null, 1, null, null),
  ('21ae0000-0000-4000-8000-000000000012', '21a00000-0000-4000-8000-000000000001', 'expense', 'pending',
   333.33, null, null, '2026-11-10', '2026-11-20', 'R21 manual 2', ' fornecedor r21 ', null,
   'manual', null, null, 1, null, null),
  -- Vínculo com viagem da empresa B (R02)
  ('21ae0000-0000-4000-8000-000000000021', '21a00000-0000-4000-8000-000000000001', 'expense', 'pending',
   41, null, null, '2026-11-10', '2026-11-20', 'R21 vínculo cruzado', null, null,
   'manual', null, null, 1, '21bd0000-0000-4000-8000-000000000001', null),
  -- Original ainda pago com estorno gravado (R06)
  ('21ae0000-0000-4000-8000-000000000031', '21a00000-0000-4000-8000-000000000001', 'expense', 'paid',
   52, 52, '2026-11-10 15:00:00+00', '2026-11-10', null, 'R21 estorno original', null, null,
   'manual', null, null, 1, null, null),
  -- Conta a receber com recebimento de 100 e paid_amount 80 (R07)
  ('21ae0000-0000-4000-8000-000000000041', '21a00000-0000-4000-8000-000000000001', 'revenue', 'pending',
   100, 80, null, '2026-11-10', '2026-11-20', 'R21 receber', null, 'Cliente R21',
   'manual', null, null, 1, null, null),
  -- Despesa em aberto sem vencimento (R08)
  ('21ae0000-0000-4000-8000-000000000051', '21a00000-0000-4000-8000-000000000001', 'expense', 'pending',
   63, null, null, '2026-11-10', null, 'R21 sem vencimento', null, null,
   'manual', null, null, 1, null, null),
  -- Receita paga sem movimento (R09, legado)
  ('21ae0000-0000-4000-8000-000000000061', '21a00000-0000-4000-8000-000000000001', 'revenue', 'paid',
   74, 74, '2026-11-10 15:00:00+00', '2026-11-10', null, 'R21 receita antiga', null, 'Cliente R21',
   'manual', null, null, 1, null, null),
  -- Duas receitas ativas na mesma viagem T2 (R10)
  ('21ae0000-0000-4000-8000-000000000071', '21a00000-0000-4000-8000-000000000001', 'revenue', 'pending',
   9000, null, null, '2026-11-10', '2026-11-30', 'R21 receita T2 a', null, 'Cliente R21',
   'manual', null, null, 1, '21ad0000-0000-4000-8000-000000000002', null),
  ('21ae0000-0000-4000-8000-000000000072', '21a00000-0000-4000-8000-000000000001', 'revenue', 'pending',
   8999, null, null, '2026-11-10', '2026-11-30', 'R21 receita T2 b', null, 'Cliente R21',
   'manual', null, null, 1, '21ad0000-0000-4000-8000-000000000002', null);

insert into public.financial_entries (
  id, company_id, entry_type, entry_status, amount, entry_date, description, source_module,
  installment_number, reversed_entry_id)
values
  ('21ae0000-0000-4000-8000-000000000032', '21a00000-0000-4000-8000-000000000001', 'reversal', 'paid',
   52, '2026-11-11', 'R21 estorno', 'manual', 1, '21ae0000-0000-4000-8000-000000000031');

insert into public.financial_entry_movements (
  company_id, financial_entry_id, kind, amount, movement_date, payment_method, idempotency_key)
values
  ('21a00000-0000-4000-8000-000000000001', '21ae0000-0000-4000-8000-000000000041', 'receipt', 100,
   '2026-11-12', 'pix', 'r21-receipt-1');

-- Despesas de viagem pelo usuário (o gatilho da 111 cria o lançamento):
-- TE1 paga pela empresa (sem achado), TE2 sem "quem pagou" (R03 aviso).
select pg_temp.act_as('21100000-0000-4000-8000-000000000001');
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date, description, paid_by, payment_method)
values
  ('21ac0000-0000-4000-8000-000000000001', '21a00000-0000-4000-8000-000000000001',
   '21ad0000-0000-4000-8000-000000000001', 'toll', 45, '2026-11-05', 'R21 pedágio', 'company', 'cash'),
  ('21ac0000-0000-4000-8000-000000000002', '21a00000-0000-4000-8000-000000000001',
   '21ad0000-0000-4000-8000-000000000001', 'food', 35, '2026-11-05', 'R21 alimentação', null, null);
select pg_temp.act_as_owner();

select pg_temp.expect('pré-condição: a 111 lançou TE1 e não lançou TE2',
  (select count(*) from public.financial_entries
   where source_module = 'trip_expense' and source_id = '21ac0000-0000-4000-8000-000000000001'
     and deleted_at is null and entry_status not in ('cancelled', 'reversed')) = 1
  and not exists (select 1 from public.financial_entries
                  where source_id = '21ac0000-0000-4000-8000-000000000002'));

-- ---------------------------------------------------------------------------
-- Achados vistos pelo Financeiro da empresa A
-- ---------------------------------------------------------------------------
select pg_temp.act_as('21100000-0000-4000-8000-000000000001');
insert into _r21_findings
select * from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001');
select pg_temp.act_as_owner();

select pg_temp.expect('cada verificação dispara uma vez e só uma vez',
  (select string_agg(format('%s:%s', check_id, n), ',' order by check_id)
   from (select check_id, count(*) n from _r21_findings group by check_id) c)
  = 'R01:1,R02:1,R03:2,R04:1,R05:1,R06:1,R07:1,R08:1,R09:1,R10:1,R14:1',
  (select string_agg(format('%s %s %s', check_id, entity_type, reference), ' | ' order by check_id)
   from _r21_findings));

select pg_temp.expect('R01 aviso: duplicidade manual aponta o primeiro e guarda os dois',
  exists (select 1 from _r21_findings
          where check_id = 'R01' and severity = 'warning'
            and entity_id = '21ae0000-0000-4000-8000-000000000011'
            and details -> 'entry_ids' = '["21ae0000-0000-4000-8000-000000000011", "21ae0000-0000-4000-8000-000000000012"]'::jsonb));

select pg_temp.expect('R02: viagem de outra empresa aparece como inexistente, sem dado dela',
  exists (select 1 from _r21_findings
          where check_id = 'R02' and severity = 'critical'
            and entity_id = '21ae0000-0000-4000-8000-000000000021'
            and details ->> 'reason' = 'missing' and details ->> 'link' = 'trip'));

select pg_temp.expect('R03: abastecimento sem lançamento é crítico, com valor esperado',
  exists (select 1 from _r21_findings
          where check_id = 'R03' and severity = 'critical' and entity_type = 'fuel_record'
            and entity_id = '21af0000-0000-4000-8000-000000000002' and expected = 200 and actual = 0));

select pg_temp.expect('R03: despesa sem "quem pagou" é só aviso e leva a viagem para o link',
  exists (select 1 from _r21_findings
          where check_id = 'R03' and severity = 'warning' and entity_type = 'trip_expense'
            and entity_id = '21ac0000-0000-4000-8000-000000000002'
            and details ->> 'reason' = 'paid_by_missing'
            and details ->> 'trip_id' = '21ad0000-0000-4000-8000-000000000001'));

select pg_temp.expect('R04: lançamento de abastecimento excluído',
  exists (select 1 from _r21_findings
          where check_id = 'R04' and entity_id = '21ae0000-0000-4000-8000-000000000004'));

select pg_temp.expect('R05: abastecimento de 500 lançado por 450',
  exists (select 1 from _r21_findings
          where check_id = 'R05' and entity_id = '21af0000-0000-4000-8000-000000000003'
            and expected = 500 and actual = 450));

select pg_temp.expect('R06: original ainda pago com estorno gravado',
  exists (select 1 from _r21_findings
          where check_id = 'R06' and entity_id = '21ae0000-0000-4000-8000-000000000031'
            and details ->> 'reason' = 'original_still_active'
            and details ->> 'reversal_id' = '21ae0000-0000-4000-8000-000000000032'));

select pg_temp.expect('R07: recebido 100 nos movimentos, 80 no título',
  exists (select 1 from _r21_findings
          where check_id = 'R07' and entity_id = '21ae0000-0000-4000-8000-000000000041'
            and expected = 100 and actual = 80 and details ->> 'reason' = 'paid_amount'));

select pg_temp.expect('R08: despesa em aberto sem vencimento',
  exists (select 1 from _r21_findings
          where check_id = 'R08' and entity_id = '21ae0000-0000-4000-8000-000000000051'
            and details ->> 'reason' = 'open_without_due_date'));

select pg_temp.expect('R09: receita paga sem movimento é legado',
  exists (select 1 from _r21_findings
          where check_id = 'R09' and legacy and severity = 'warning'
            and entity_id = '21ae0000-0000-4000-8000-000000000061'));

select pg_temp.expect('R10: viagem T2 com duas receitas ativas',
  exists (select 1 from _r21_findings
          where check_id = 'R10' and entity_type = 'trip'
            and entity_id = '21ad0000-0000-4000-8000-000000000002'
            and (details ->> 'entries')::int = 2 and actual = 17999));

select pg_temp.expect('R14: abastecimento das 23h30 lançado no dia UTC seguinte',
  exists (select 1 from _r21_findings
          where check_id = 'R14' and entity_id = '21ae0000-0000-4000-8000-000000000005'
            and details ->> 'entry_date' = '2026-11-06' and details ->> 'source_date' = '2026-11-05'));

select pg_temp.expect('nenhum achado aponta para o que está certo (F1, TE1, estorno, viagem T1)',
  not exists (select 1 from _r21_findings
              where entity_id in (
                '21ae0000-0000-4000-8000-000000000001',
                '21af0000-0000-4000-8000-000000000001',
                '21ac0000-0000-4000-8000-000000000001',
                '21ae0000-0000-4000-8000-000000000032',
                '21ad0000-0000-4000-8000-000000000001')));

select pg_temp.expect('a função não grava: nenhum lançamento ou movimento novo',
  (select count(*) from public.financial_entries
   where company_id = '21a00000-0000-4000-8000-000000000001') = 15
  and (select count(*) from public.financial_entry_movements
       where company_id = '21a00000-0000-4000-8000-000000000001') = 1);

-- ---------------------------------------------------------------------------
-- Limite, período e resumo
-- ---------------------------------------------------------------------------
select pg_temp.act_as('21100000-0000-4000-8000-000000000001');

select pg_temp.expect('limite 1: no máximo um achado por verificação',
  not exists (
    select 1
    from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001', null, null, 1)
    group by check_id
    having count(*) > 1)
  and (select count(*)
       from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001', null, null, 1)
       where check_id = 'R03') = 1);

select pg_temp.expect('período sem dados não devolve achado',
  not exists (select 1 from public.financial_reconciliation_findings(
    '21a00000-0000-4000-8000-000000000001', null, '2000-01-01')));

select pg_temp.expect('período invertido é recusado',
  pg_temp.error_of($q$
    select * from public.financial_reconciliation_findings(
      '21a00000-0000-4000-8000-000000000001', '2026-12-01', '2026-11-01')
  $q$) like '22023:%');

select pg_temp.expect('o resumo conta o mesmo que a lista, por severidade e legado',
  (select string_agg(format('%s/%s:%s/%s', check_id, severity, findings, legacy_findings), ','
                     order by check_id, severity)
   from public.financial_reconciliation_summary('21a00000-0000-4000-8000-000000000001'))
  = 'R01/warning:1/0,R02/critical:1/0,R03/critical:1/0,R03/warning:1/0,R04/critical:1/0,R05/high:1/0,'
    || 'R06/high:1/0,R07/high:1/0,R08/high:1/0,R09/warning:1/1,R10/high:1/0,R14/warning:1/0');

-- ---------------------------------------------------------------------------
-- Permissão e isolamento
-- ---------------------------------------------------------------------------
select pg_temp.act_as('21200000-0000-4000-8000-000000000001');
select pg_temp.expect('sem financeiro:read, a reconciliação é recusada',
  pg_temp.error_of($q$
    select * from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001')
  $q$) like '42501:%');

select pg_temp.act_as('21300000-0000-4000-8000-000000000001');
select pg_temp.expect('o Financeiro da empresa B não consulta a empresa A',
  pg_temp.error_of($q$
    select * from public.financial_reconciliation_summary('21a00000-0000-4000-8000-000000000001')
  $q$) like '42501:%');
select pg_temp.expect('na própria empresa B, nenhum achado (nada da A vaza)',
  not exists (select 1 from public.financial_reconciliation_findings('21b00000-0000-4000-8000-000000000001')));

-- Quem só tem financeiro:read não lê abastecimentos nem viagens: os vínculos e
-- as origens que ele não enxerga não podem virar "inexistente" (falso positivo).
select pg_temp.act_as('21400000-0000-4000-8000-000000000001');
select pg_temp.expect('Financeiro sem acesso aos módulos: nenhum órfão ou vínculo falso',
  (select string_agg(format('%s:%s', check_id, entity_id), ',' order by check_id)
   from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001')
   where check_id in ('R02', 'R04'))
  = 'R02:21ae0000-0000-4000-8000-000000000021,R04:21ae0000-0000-4000-8000-000000000004',
  (select string_agg(format('%s %s %s', check_id, entity_id, details), ' | ')
   from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001')
   where check_id in ('R02', 'R04')));
-- 114 (security definer): a cobertura não depende mais dos módulos que o usuário lê.
select pg_temp.expect('Financeiro sem acesso aos módulos recebe a mesma lista completa',
  (select count(*) from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001'))
  = (select count(*) from _r21_findings));
select pg_temp.expect('ref_state: id de outra empresa responde missing, sem revelar que existe',
  public.financial_reconciliation_ref_state(
    '21a00000-0000-4000-8000-000000000001', 'trip', '21bd0000-0000-4000-8000-000000000001') = 'missing'
  and public.financial_reconciliation_ref_state(
    '21a00000-0000-4000-8000-000000000001', 'fuel', '21af0000-0000-4000-8000-000000000004') = 'deleted'
  and public.financial_reconciliation_ref_state(
    '21a00000-0000-4000-8000-000000000001', 'trip_expense', '21ac0000-0000-4000-8000-000000000002') = 'inactive'
  and public.financial_reconciliation_ref_state(
    '21a00000-0000-4000-8000-000000000001', 'fuel', '21af0000-0000-4000-8000-000000000001') = 'ok');

select pg_temp.act_as('21200000-0000-4000-8000-000000000001');
select pg_temp.expect('ref_state também exige financeiro:read',
  pg_temp.error_of($q$
    select public.financial_reconciliation_ref_state(
      '21a00000-0000-4000-8000-000000000001', 'trip', '21ad0000-0000-4000-8000-000000000001')
  $q$) like '42501:%');

select pg_temp.act_as_owner();
select pg_temp.expect('empresa nula é recusada',
  pg_temp.error_of($q$ select * from public.financial_reconciliation_findings(null) $q$) like '22023:%');

select pg_temp.expect('o dono do banco (ignora RLS) vê os mesmos achados da empresa A',
  (select count(*) from public.financial_reconciliation_findings('21a00000-0000-4000-8000-000000000001'))
  = (select count(*) from _r21_findings));

-- ---------------------------------------------------------------------------
-- Catálogo: acesso e forma das funções
-- ---------------------------------------------------------------------------
select pg_temp.expect('anon não executa nenhuma das funções; authenticated executa',
  not has_function_privilege('anon', 'public.financial_reconciliation_findings(uuid, date, date, integer)', 'execute')
  and not has_function_privilege('anon', 'public.financial_reconciliation_summary(uuid, date, date)', 'execute')
  and not has_function_privilege('anon', 'public.financial_reconciliation_ref_state(uuid, text, uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.financial_reconciliation_findings(uuid, date, date, integer)', 'execute')
  and has_function_privilege('authenticated', 'public.financial_reconciliation_summary(uuid, date, date)', 'execute'));

-- 114: achados e ref_state são security definer (porta = verificação de permissão);
-- resumo e período continuam invoker. Nenhuma pode alterar dados (stable/immutable).
select pg_temp.expect('definer só nos achados e na ref_state; nenhuma função volátil',
  (select string_agg(format('%s:%s:%s', p.proname, p.prosecdef, p.provolatile), ',' order by p.proname)
   from pg_proc p
   where p.pronamespace = 'public'::regnamespace
     and p.proname like 'financial_reconciliation%')
  = 'financial_reconciliation_findings:t:s,financial_reconciliation_in_period:f:i,'
    || 'financial_reconciliation_ref_state:t:s,financial_reconciliation_summary:f:s');

select seq, name, ok, detail from _r21_results order by seq;

do $$
declare
  v_total int;
  v_failed int;
  v_names text;
begin
  select count(*), count(*) filter (where not ok), string_agg(name, ' | ') filter (where not ok)
  into v_total, v_failed, v_names
  from _r21_results;
  raise exception 'Fase 2.1 (113): ok=% falhas=% %', v_total - v_failed, v_failed, coalesce(v_names, '');
end;
$$;

rollback;
