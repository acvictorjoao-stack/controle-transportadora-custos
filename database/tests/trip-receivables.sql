-- FleetControl — teste comportamental das migrations 105 a 108
-- Rodar SOMENTE em banco local com as migrations aplicadas, como superusuário.
-- Tudo roda numa transação desfeita no fim; nenhum dado permanece.

begin;

create temp table _tr_results (
  seq     serial,
  name    text not null,
  ok      boolean not null,
  detail  text
);
grant all on _tr_results to authenticated;
grant all on sequence _tr_results_seq_seq to authenticated;

create function pg_temp.expect(p_name text, p_ok boolean, p_detail text default null)
returns void
language sql
as $$
  insert into pg_temp._tr_results (name, ok, detail)
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

-- Executa o comando e devolve a mensagem de erro; nulo quando passou.
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

create function pg_temp.new_trip(
  p_id uuid,
  p_number text,
  p_freight numeric,
  p_condition text default 'term',
  p_customer uuid default 'ca000000-0000-4000-8000-000000000001',
  p_company uuid default 'a0000000-0000-4000-8000-000000000001'
)
returns void
language sql
as $$
  insert into public.trips (
    id, company_id, trip_number, customer_id, actual_freight_value,
    payment_condition, payment_issue_date, payment_due_date
  )
  values (
    p_id, p_company, p_number, p_customer, p_freight,
    p_condition,
    case when p_condition is null then null else date '2026-11-01' end,
    case when p_condition is null then null else date '2026-12-01' end
  );
$$;

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11000000-0000-4000-8000-000000000001', 'op@tr.test',  '{"full_name": "Operacional"}'),
  ('12000000-0000-4000-8000-000000000001', 'fin@tr.test', '{"full_name": "Financeiro"}'),
  ('13000000-0000-4000-8000-000000000001', 'b@tr.test',   '{"full_name": "Financeiro B"}');

insert into public.companies (id, legal_name, tax_id, slug, email)
values
  ('a0000000-0000-4000-8000-000000000001', 'Empresa TR A', 'TR-TAX-A', 'tr-empresa-a', 'a@tr.test'),
  ('b0000000-0000-4000-8000-000000000001', 'Empresa TR B', 'TR-TAX-B', 'tr-empresa-b', 'b@tr.test');

select pg_temp.add_member(
  'a0000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'TR Operacional',
  array['trips:read', 'trips:create', 'trips:update', 'customers:read']);
select pg_temp.add_member(
  'a0000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'TR Financeiro',
  array['financeiro:read', 'financeiro:create', 'financeiro:update', 'financeiro:delete', 'trips:read']);
select pg_temp.add_member(
  'b0000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'TR Financeiro B',
  array['financeiro:read', 'financeiro:create', 'financeiro:update', 'trips:read', 'trips:create', 'trips:update']);

insert into public.customers (id, company_id, legal_name, trade_name)
values
  ('ca000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Cliente A SA', 'Cliente A'),
  ('ca000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Cliente A2 SA', 'Cliente A2'),
  ('cb000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Cliente B SA', 'Cliente B');

create temp view _title as
select fe.*
from public.financial_entries fe
where fe.trip_charge_key = 'freight';
grant select on _title to authenticated;

-- ---------------------------------------------------------------------------
-- Cadastro atômico
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
select pg_temp.new_trip('10000000-0000-4000-8000-000000000001', 'TR-001', 8500);
select pg_temp.act_as_owner();

select pg_temp.expect('título nasce com a viagem, mesmo para quem não tem permissão financeira',
  (select amount = 8500 and entry_status = 'pending' and source_module = 'accounts_receivable'
     and source_id = trip_id and is_system_generated and client = 'Cliente A'
     and due_date = date '2026-12-01' and entry_date = date '2026-11-01'
   from _title where trip_id = '10000000-0000-4000-8000-000000000001'));

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
select pg_temp.expect('sem cliente, a viagem inteira falha',
  pg_temp.error_of($q$select pg_temp.new_trip('10000000-0000-4000-8000-000000000002', 'TR-002', 100, 'term', null)$q$)
    like '%Informe o cliente%');
select pg_temp.expect('nada é salvo parcialmente',
  not exists (select 1 from public.trips where id = '10000000-0000-4000-8000-000000000002'));
select pg_temp.expect('cliente de outra empresa é recusado',
  pg_temp.error_of($q$select pg_temp.new_trip('10000000-0000-4000-8000-000000000003', 'TR-003', 100, 'term', 'cb000000-0000-4000-8000-000000000001')$q$)
    is not null);
select pg_temp.expect('viagem em empresa alheia é recusada',
  pg_temp.error_of($q$select pg_temp.new_trip('10000000-0000-4000-8000-000000000004', 'TR-004', 100, 'term', 'cb000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001')$q$)
    is not null);

select pg_temp.new_trip('10000000-0000-4000-8000-000000000005', 'TR-005', 300, null);
select pg_temp.act_as_owner();
select pg_temp.expect('viagem sem condição não gera título',
  not exists (select 1 from _title where trip_id = '10000000-0000-4000-8000-000000000005'));

select pg_temp.expect('segundo título da mesma cobrança é impedido pelo índice',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, trip_id, entry_type, amount, source_module, trip_charge_key)
    values ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'revenue', 1, 'accounts_receivable', 'freight')
  $q$) like '%idx_financial_entries_trip_charge%');

select pg_temp.expect('o mesmo pedido de criação não gera duas viagens',
  pg_temp.error_of($q$
    insert into public.trips (id, company_id, trip_number, creation_request_id) values
      ('10000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'TR-006', 'dd000000-0000-4000-8000-000000000001'),
      ('10000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'TR-007', 'dd000000-0000-4000-8000-000000000001')
  $q$) like '%idx_trips_creation_request%');

-- ---------------------------------------------------------------------------
-- Sincronização antes do recebimento
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
update public.trips
set actual_freight_value = 8000, customer_id = 'ca000000-0000-4000-8000-000000000002'
where id = '10000000-0000-4000-8000-000000000001';
select pg_temp.act_as_owner();

select pg_temp.expect('frete e cliente sincronizam antes do recebimento',
  (select amount = 8000 and customer_id = 'ca000000-0000-4000-8000-000000000002' and client = 'Cliente A2'
   from _title where trip_id = '10000000-0000-4000-8000-000000000001'));
select pg_temp.expect('a sincronização fica no histórico',
  exists (
    select 1 from public.financial_history h
    join _title t on t.id = h.financial_entry_id
    where t.trip_id = '10000000-0000-4000-8000-000000000001'
      and h.action = 'update' and h.changes ? 'amount'));

update public.trips
set actual_freight_value = 8500, customer_id = 'ca000000-0000-4000-8000-000000000001'
where id = '10000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Recebimento parcial
-- ---------------------------------------------------------------------------

create temp table _ids (name text primary key, id uuid);
grant all on _ids to authenticated;
insert into _ids
select 'title', id from _title where trip_id = '10000000-0000-4000-8000-000000000001';

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
select pg_temp.expect('Operacional não registra recebimento',
  pg_temp.error_of($q$select public.register_receivable_receipt((select id from _ids where name = 'title'), 10, date '2026-11-02', 'pix', null, 'k-op')$q$)
    like '%Sem permissão%');

select pg_temp.act_as('13000000-0000-4000-8000-000000000001');
select pg_temp.expect('Financeiro de outra empresa não registra recebimento',
  pg_temp.error_of($q$select public.register_receivable_receipt((select id from _ids where name = 'title'), 10, date '2026-11-02', 'pix', null, 'k-b')$q$)
    like '%Sem permissão%');

select pg_temp.act_as('12000000-0000-4000-8000-000000000001');
insert into _ids
select 'receipt', public.register_receivable_receipt(
  (select id from _ids where name = 'title'), 5000, date '2026-11-05', 'pix', 'Primeira parcela', 'k-1');
insert into _ids
select 'replay', public.register_receivable_receipt(
  (select id from _ids where name = 'title'), 5000, date '2026-11-05', 'pix', 'Primeira parcela', 'k-1');
select pg_temp.act_as_owner();

select pg_temp.expect('parcial mantém o título aberto com o saldo correto',
  (select entry_status = 'pending' and paid_amount = 5000 and paid_at is null
     and amount + adjustment_total - paid_amount = 3500
   from public.financial_entries where id = (select id from _ids where name = 'title')));
select pg_temp.expect('repetir a chave devolve o mesmo recebimento',
  (select count(distinct id) = 1 from _ids where name in ('receipt', 'replay'))
  and (select count(*) = 1 from public.financial_entry_movements
       where financial_entry_id = (select id from _ids where name = 'title')));
select pg_temp.expect('o recebimento guarda responsável, forma e observação',
  (select created_by = '12000000-0000-4000-8000-000000000001' and payment_method = 'pix'
     and notes = 'Primeira parcela' and movement_date = date '2026-11-05'
   from public.financial_entry_movements where id = (select id from _ids where name = 'receipt')));

select pg_temp.act_as('12000000-0000-4000-8000-000000000001');
select pg_temp.expect('valor acima do saldo é recusado',
  pg_temp.error_of($q$select public.register_receivable_receipt((select id from _ids where name = 'title'), 3500.01, date '2026-11-02', null, null, 'k-2')$q$)
    like '%excede o saldo%');
select pg_temp.expect('data futura é recusada',
  pg_temp.error_of($q$select public.register_receivable_receipt((select id from _ids where name = 'title'), 1, date '2099-01-01', null, null, 'k-3')$q$)
    like '%futura%');
select pg_temp.expect('escrita direta em movimentos é negada',
  pg_temp.error_of($q$
    insert into public.financial_entry_movements (company_id, financial_entry_id, kind, amount, movement_date, idempotency_key)
    values ('a0000000-0000-4000-8000-000000000001', (select id from _ids where name = 'title'), 'receipt', 1, date '2026-11-01', 'k-x')
  $q$) is not null);
select pg_temp.expect('funções internas não ficam expostas',
  pg_temp.error_of($q$select public.recompute_receivable_entry((select id from _ids where name = 'title'))$q$)
    like '%permission denied%');
select pg_temp.expect('quitar o título por update direto é negado',
  pg_temp.error_of($q$update public.financial_entries set entry_status = 'paid' where id = (select id from _ids where name = 'title')$q$)
    is not null);
select pg_temp.expect('mudar o valor do título por update direto é negado',
  pg_temp.error_of($q$update public.financial_entries set amount = 1 where id = (select id from _ids where name = 'title')$q$)
    is not null);
select pg_temp.expect('excluir o título é negado',
  pg_temp.error_of($q$update public.financial_entries set deleted_at = now() where id = (select id from _ids where name = 'title')$q$)
    is not null);
select pg_temp.expect('remover o título em definitivo é negado',
  pg_temp.error_of($q$delete from public.financial_entries where id = (select id from _ids where name = 'title')$q$)
    is not null);
select pg_temp.expect('campos descritivos continuam editáveis',
  pg_temp.error_of($q$update public.financial_entries set notes = 'Observação' where id = (select id from _ids where name = 'title')$q$)
    is null);

-- ---------------------------------------------------------------------------
-- Fluxo de caixa e isolamento
-- ---------------------------------------------------------------------------

select pg_temp.expect('caixa mostra só a entrada recebida e o saldo à parte',
  (select count(*) = 2
     and sum(line_amount) filter (where line_status = 'paid') = 5000
     and sum(line_amount) filter (where line_status = 'pending') = 3500
     and max(movement_date) filter (where line_status = 'paid') = date '2026-11-05'
   from public.financial_cash_flow_lines
   where financial_entry_id = (select id from _ids where name = 'title')));

select pg_temp.act_as('13000000-0000-4000-8000-000000000001');
select pg_temp.expect('outra empresa não enxerga linhas de caixa',
  not exists (select 1 from public.financial_cash_flow_lines where company_id = 'a0000000-0000-4000-8000-000000000001'));
select pg_temp.expect('outra empresa não enxerga movimentos',
  not exists (select 1 from public.financial_entry_movements where company_id = 'a0000000-0000-4000-8000-000000000001'));

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
select pg_temp.expect('Operacional segue sem ler títulos e movimentos',
  not exists (select 1 from public.financial_entries where company_id = 'a0000000-0000-4000-8000-000000000001')
  and not exists (select 1 from public.financial_entry_movements));

-- ---------------------------------------------------------------------------
-- Alterações depois do recebimento
-- ---------------------------------------------------------------------------

select pg_temp.expect('frete não muda direto depois do recebimento',
  pg_temp.error_of($q$update public.trips set actual_freight_value = 9000 where id = '10000000-0000-4000-8000-000000000001'$q$)
    like '%ajuste%');
select pg_temp.expect('cliente não muda depois do recebimento',
  pg_temp.error_of($q$update public.trips set customer_id = 'ca000000-0000-4000-8000-000000000002' where id = '10000000-0000-4000-8000-000000000001'$q$)
    like '%cliente%');
select pg_temp.expect('viagem com recebimento não é cancelada',
  pg_temp.error_of($q$update public.trips set trip_status = 'cancelled' where id = '10000000-0000-4000-8000-000000000001'$q$)
    like '%estornar%');
select pg_temp.expect('viagem com recebimento não é excluída',
  pg_temp.error_of($q$update public.trips set deleted_at = now() where id = '10000000-0000-4000-8000-000000000001'$q$)
    like '%estornar%');

select pg_temp.act_as('12000000-0000-4000-8000-000000000001');
select pg_temp.expect('ajuste abaixo do recebido é recusado',
  pg_temp.error_of($q$select public.adjust_receivable_amount((select id from _ids where name = 'title'), 4000, 'Erro', 'k-a1')$q$)
    like '%menor que o recebido%');
select pg_temp.expect('ajuste exige motivo',
  pg_temp.error_of($q$select public.adjust_receivable_amount((select id from _ids where name = 'title'), 9000, '  ', 'k-a2')$q$)
    like '%motivo%');
insert into _ids
select 'adjust', public.adjust_receivable_amount(
  (select id from _ids where name = 'title'), 9000, 'Reajuste contratual', 'k-a3');
select pg_temp.act_as_owner();

select pg_temp.expect('ajuste preserva o valor original e atualiza a viagem',
  (select amount = 8500 and adjustment_total = 500 and paid_amount = 5000 and entry_status = 'pending'
   from public.financial_entries where id = (select id from _ids where name = 'title'))
  and (select actual_freight_value = 9000 from public.trips where id = '10000000-0000-4000-8000-000000000001'));
select pg_temp.expect('ajuste não entra no caixa',
  (select sum(line_amount) filter (where line_status = 'paid') = 5000
     and sum(line_amount) filter (where line_status = 'pending') = 4000
   from public.financial_cash_flow_lines
   where financial_entry_id = (select id from _ids where name = 'title')));
select pg_temp.expect('ajuste e recebimento ficam no histórico',
  (select count(*) = 2 from public.financial_history
   where financial_entry_id = (select id from _ids where name = 'title')
     and action in ('receipt', 'adjustment')));

select pg_temp.expect('movimento não pode ser alterado',
  pg_temp.error_of($q$update public.financial_entry_movements set amount = 1 where id = (select id from _ids where name = 'receipt')$q$)
    like '%não podem ser alterados%');

-- ---------------------------------------------------------------------------
-- Estorno e cancelamento
-- ---------------------------------------------------------------------------

select pg_temp.act_as('12000000-0000-4000-8000-000000000001');
insert into _ids
select 'reversal', public.reverse_receivable_receipt(
  (select id from _ids where name = 'receipt'), 'Devolução ao cliente', 'k-r1');
select pg_temp.expect('o mesmo recebimento não é estornado duas vezes',
  pg_temp.error_of($q$select public.reverse_receivable_receipt((select id from _ids where name = 'receipt'), 'De novo', 'k-r2')$q$)
    like '%já foi estornado%');
select pg_temp.act_as_owner();

select pg_temp.expect('estorno reabre o saldo e sai do caixa',
  (select paid_amount is null and entry_status = 'pending'
   from public.financial_entries where id = (select id from _ids where name = 'title'))
  and (select sum(line_amount) filter (where line_status = 'paid') = 0
       from public.financial_cash_flow_lines
       where financial_entry_id = (select id from _ids where name = 'title')));

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
update public.trips set trip_status = 'cancelled' where id = '10000000-0000-4000-8000-000000000001';
select pg_temp.new_trip('10000000-0000-4000-8000-000000000008', 'TR-008', 700);
update public.trips set trip_status = 'cancelled' where id = '10000000-0000-4000-8000-000000000008';
select pg_temp.act_as_owner();

select pg_temp.expect('depois do estorno a viagem cancela e o histórico fica',
  (select entry_status = 'cancelled' from public.financial_entries where id = (select id from _ids where name = 'title'))
  and (select count(*) = 3 from public.financial_entry_movements
       where financial_entry_id = (select id from _ids where name = 'title')));
select pg_temp.expect('viagem sem recebimento cancela o título automaticamente',
  (select entry_status = 'cancelled' from _title where trip_id = '10000000-0000-4000-8000-000000000008'));

-- ---------------------------------------------------------------------------
-- Quitação, DRE e estatísticas
-- ---------------------------------------------------------------------------

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
select pg_temp.new_trip('10000000-0000-4000-8000-000000000009', 'TR-009', 1000);
select pg_temp.act_as_owner();
insert into _ids select 'title9', id from _title where trip_id = '10000000-0000-4000-8000-000000000009';

select pg_temp.expect('título pendente de viagem aberta não vira receita nas estatísticas',
  (public.get_financial_stats('a0000000-0000-4000-8000-000000000001') ->> 'revenue')::numeric = 0);

update public.trips
set trip_status = 'completed', completed_at = now()
where id = '10000000-0000-4000-8000-000000000009';

select pg_temp.expect('viagem concluída conta uma única vez',
  (public.get_financial_stats('a0000000-0000-4000-8000-000000000001') ->> 'revenue')::numeric = 1000);

select pg_temp.act_as('12000000-0000-4000-8000-000000000001');
select public.register_receivable_receipt(
  (select id from _ids where name = 'title9'), 400, date '2026-11-03', 'boleto', null, 'k-9a');
select public.register_receivable_receipt(
  (select id from _ids where name = 'title9'), 600, date '2026-11-04', 'cash', null, 'k-9b');
select pg_temp.expect('quitação integral fecha o título',
  (select entry_status = 'paid' and paid_amount = 1000 and paid_at::date = date '2026-11-04'
   from public.financial_entries where id = (select id from _ids where name = 'title9')));
select pg_temp.expect('título quitado não recebe mais',
  pg_temp.error_of($q$select public.register_receivable_receipt((select id from _ids where name = 'title9'), 1, date '2026-11-04', null, null, 'k-9c')$q$)
    like '%em aberto%');
select pg_temp.act_as_owner();

select pg_temp.expect('recebimento não muda a receita das estatísticas',
  (public.get_financial_stats('a0000000-0000-4000-8000-000000000001') ->> 'revenue')::numeric = 1000);
select pg_temp.expect('caixa traz uma linha por recebimento, sem saldo',
  (select count(*) = 2 and sum(line_amount) = 1000
   from public.financial_cash_flow_lines
   where financial_entry_id = (select id from _ids where name = 'title9')));

-- ---------------------------------------------------------------------------
-- Dados antigos
-- ---------------------------------------------------------------------------

insert into public.trips (id, company_id, trip_number, customer_id, actual_freight_value)
values ('10000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-000000000001', 'TR-OLD', 'ca000000-0000-4000-8000-000000000001', 500);
insert into public.financial_entries (id, company_id, trip_id, entry_type, entry_status, amount, source_module, source_id, is_system_generated)
values ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-00000000000a', 'revenue', 'paid', 500, 'trips', '10000000-0000-4000-8000-00000000000a', true);

select pg_temp.act_as('11000000-0000-4000-8000-000000000001');
select pg_temp.expect('viagem antiga com receita não ganha segunda receita',
  pg_temp.error_of($q$
    update public.trips
    set payment_condition = 'term', payment_issue_date = date '2026-11-01', payment_due_date = date '2026-12-01'
    where id = '10000000-0000-4000-8000-00000000000a'
  $q$) like '%já possui receita%');
update public.trips set notes = 'Edição comum' where id = '10000000-0000-4000-8000-00000000000a';
select pg_temp.act_as_owner();
select pg_temp.expect('edição comum de viagem antiga não mexe no financeiro',
  (select count(*) = 1 from public.financial_entries where trip_id = '10000000-0000-4000-8000-00000000000a'));

insert into public.financial_entries (id, company_id, entry_type, entry_status, amount, paid_amount, paid_at, entry_date, source_module, client)
values
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'revenue', 'paid', 200, 180, '2026-10-10T12:00:00Z', date '2026-10-01', 'accounts_receivable', 'Antigo'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'revenue', 'pending', 900, null, null, date '2026-10-01', 'accounts_receivable', 'Manual');

select pg_temp.expect('título antigo quitado aparece como sempre no caixa',
  (select count(*) = 1 and sum(line_amount) = 180 and max(movement_date) = date '2026-10-10'
   from public.financial_cash_flow_lines
   where financial_entry_id = 'e0000000-0000-4000-8000-000000000002'));

select pg_temp.act_as('12000000-0000-4000-8000-000000000001');
select public.register_receivable_receipt(
  'e0000000-0000-4000-8000-000000000003', 300, date '2026-11-01', 'transfer', null, 'k-m1');
select pg_temp.expect('título manual também aceita parcial',
  (select entry_status = 'pending' and paid_amount = 300
   from public.financial_entries where id = 'e0000000-0000-4000-8000-000000000003'));
select pg_temp.expect('título manual com recebimento não é cancelado direto',
  pg_temp.error_of($q$update public.financial_entries set entry_status = 'cancelled' where id = 'e0000000-0000-4000-8000-000000000003'$q$)
    is not null);
select pg_temp.act_as_owner();

select seq, name, ok, detail from _tr_results order by seq;

do $$
declare
  v_failed int;
begin
  select count(*) into v_failed from _tr_results where not ok;
  if v_failed > 0 then
    raise exception 'Casos reprovados: %', v_failed;
  end if;
end;
$$;

rollback;
