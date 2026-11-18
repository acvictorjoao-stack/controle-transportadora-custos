-- FleetControl — teste comportamental da migration 111 (Fase 1, Etapa 2)
-- Rodar SOMENTE em banco local com as migrations aplicadas, como superusuário.
-- Tudo roda numa transação desfeita no fim; nenhum dado permanece.
--
-- Cobre: inserção, edição de valor e de quem pagou, exclusão lógica, estorno de
-- despesa paga, duplicidade, usuário só com viagens, proteção do lançamento,
-- isolamento entre empresas, compatibilidade com 109 e 110 e reset.

begin;

create temp table _e2_results (
  seq     serial,
  name    text not null,
  ok      boolean not null,
  detail  text
);
grant all on _e2_results to authenticated;
grant all on sequence _e2_results_seq_seq to authenticated;

create function pg_temp.expect(p_name text, p_ok boolean, p_detail text default null)
returns void
language sql
as $$
  insert into pg_temp._e2_results (name, ok, detail)
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

-- Lançamento ativo (expense) da despesa, visto pelo dono.
create function pg_temp.entry_of(p_expense uuid)
returns public.financial_entries
language sql
as $$
  select fe.*
  from public.financial_entries fe
  where fe.source_module = 'trip_expense'
    and fe.source_id = p_expense
    and fe.entry_type = 'expense'
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
  limit 1;
$$;

create function pg_temp.entries_of(p_expense uuid)
returns bigint
language sql
as $$
  select count(*)
  from public.financial_entries fe
  where fe.source_module = 'trip_expense'
    and fe.source_id = p_expense;
$$;

-- Empresas, usuários e permissões
insert into auth.users (id, email, raw_user_meta_data)
values
  ('e2100000-0000-4000-8000-000000000001', 'op@e2.test',  '{"full_name": "Só viagens"}'),
  ('e2200000-0000-4000-8000-000000000001', 'fin@e2.test', '{"full_name": "Financeiro"}'),
  ('e2300000-0000-4000-8000-000000000001', 'b@e2.test',   '{"full_name": "Viagens B"}');

insert into public.companies (id, legal_name, tax_id, slug, email)
values
  ('2a000000-0000-4000-8000-000000000001', 'Empresa E2 A', 'E2-TAX-A', 'e2-empresa-a', 'a@e2.test'),
  ('2b000000-0000-4000-8000-000000000001', 'Empresa E2 B', 'E2-TAX-B', 'e2-empresa-b', 'b@e2.test');

-- Só viagens: pode lançar despesa, não pode ler nem gravar no financeiro.
select pg_temp.add_member(
  '2a000000-0000-4000-8000-000000000001', 'e2100000-0000-4000-8000-000000000001', 'E2 Viagens',
  array['trips:read', 'trips:create', 'trips:update']);
select pg_temp.add_member(
  '2a000000-0000-4000-8000-000000000001', 'e2200000-0000-4000-8000-000000000001', 'E2 Financeiro',
  array['financeiro:read', 'financeiro:create', 'financeiro:update', 'financeiro:delete', 'trips:read']);
select pg_temp.add_member(
  '2b000000-0000-4000-8000-000000000001', 'e2300000-0000-4000-8000-000000000001', 'E2 Viagens B',
  array['trips:read', 'trips:create', 'trips:update']);

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
insert into public.trips (id, company_id, trip_number, actual_freight_value)
values ('2d000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001', 'E2-001', 10000);
select pg_temp.act_as('e2300000-0000-4000-8000-000000000001');
insert into public.trips (id, company_id, trip_number, actual_freight_value)
values ('2d000000-0000-4000-8000-000000000002', '2b000000-0000-4000-8000-000000000001', 'E2-B-001', 5000);
select pg_temp.act_as_owner();

-- ---------------------------------------------------------------------------
-- Inserção (usuário só com viagens)
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date)
values ('2e000000-0000-4000-8000-000000000001', '2a000000-0000-4000-8000-000000000001',
        '2d000000-0000-4000-8000-000000000001', 'toll', 120, date '2026-11-02');
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date, paid_by, payment_method)
values ('2e000000-0000-4000-8000-000000000002', '2a000000-0000-4000-8000-000000000001',
        '2d000000-0000-4000-8000-000000000001', 'toll', 300, date '2026-11-02', 'company', 'toll_tag');
select pg_temp.expect('usuário só com viagens não lê o financeiro',
  not exists (select 1 from public.financial_entries));
select pg_temp.act_as_owner();

select pg_temp.expect('sem quem pagou, nada é integrado (código antigo, D10)',
  pg_temp.entries_of('2e000000-0000-4000-8000-000000000001') = 0);
select pg_temp.expect('despesa da empresa por tag nasce paga, um lançamento só',
  (select e.entry_status = 'paid' and e.amount = 300 and e.paid_amount = 300
     and e.entry_date = date '2026-11-02' and e.is_system_generated
     and e.trip_id = '2d000000-0000-4000-8000-000000000001'
     and coalesce(e.installment_number, 1) = 1
     and e.metadata ->> 'treatment' = 'paid'
   from pg_temp.entry_of('2e000000-0000-4000-8000-000000000002') e)
  and pg_temp.entries_of('2e000000-0000-4000-8000-000000000002') = 1);

-- ---------------------------------------------------------------------------
-- Edição de valor e de quem pagou
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
update public.trip_expenses set amount = 350 where id = '2e000000-0000-4000-8000-000000000002';
update public.trip_expenses set amount = 350 where id = '2e000000-0000-4000-8000-000000000002';
select pg_temp.act_as_owner();
select pg_temp.expect('edição de valor atualiza o mesmo lançamento, sem criar outro',
  (select amount = 350 and paid_amount = 350 from pg_temp.entry_of('2e000000-0000-4000-8000-000000000002'))
  and pg_temp.entries_of('2e000000-0000-4000-8000-000000000002') = 1);
select pg_temp.expect('a edição fica no histórico do lançamento',
  exists (select 1 from public.financial_history h
          where h.financial_entry_id = (select id from pg_temp.entry_of('2e000000-0000-4000-8000-000000000002'))
            and h.changes ? 'amount'));

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
update public.trip_expenses set paid_by = 'driver', payment_method = 'own_money'
where id = '2e000000-0000-4000-8000-000000000002';
select pg_temp.act_as_owner();
select pg_temp.expect('motorista com dinheiro próprio vira reembolso pendente no mesmo lançamento',
  (select entry_status = 'pending' and paid_amount is null and paid_at is null
     and due_date = date '2026-11-02' and metadata ->> 'treatment' = 'payable'
   from pg_temp.entry_of('2e000000-0000-4000-8000-000000000002'))
  and pg_temp.entries_of('2e000000-0000-4000-8000-000000000002') = 1);

-- Reembolso baixa o lançamento original (sem segundo custo).
select pg_temp.act_as('e2200000-0000-4000-8000-000000000001');
update public.financial_entries
set entry_status = 'paid', paid_amount = 350, paid_at = timestamptz '2026-11-05 12:00+00'
where id = (select id from pg_temp.entry_of('2e000000-0000-4000-8000-000000000002'));
select pg_temp.act_as_owner();
select pg_temp.expect('Financeiro baixa o reembolso no próprio lançamento',
  (select entry_status = 'paid' and paid_amount = 350 from pg_temp.entry_of('2e000000-0000-4000-8000-000000000002'))
  and (select count(*) from public.financial_entries
       where company_id = '2a000000-0000-4000-8000-000000000001' and entry_type = 'expense'
         and source_module = 'trip_expense' and source_id = '2e000000-0000-4000-8000-000000000002') = 1);

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
select pg_temp.expect('reembolso pago: valor não muda sem estornar o pagamento',
  pg_temp.error_of($q$update public.trip_expenses set amount = 400 where id = '2e000000-0000-4000-8000-000000000002'$q$)
    like '%Estorne o pagamento%');
select pg_temp.expect('reembolso pago: quem pagou não muda sem estornar o pagamento',
  pg_temp.error_of($q$update public.trip_expenses set paid_by = 'company', payment_method = 'cash' where id = '2e000000-0000-4000-8000-000000000002'$q$)
    like '%Estorne o pagamento%');
select pg_temp.expect('reembolso pago: a despesa não pode ser excluída sem estornar',
  pg_temp.error_of($q$update public.trip_expenses set deleted_at = now() where id = '2e000000-0000-4000-8000-000000000002'$q$)
    like '%Estorne o pagamento%');
select pg_temp.expect('quem pagou não pode ser apagado de despesa integrada',
  pg_temp.error_of($q$update public.trip_expenses set paid_by = null, payment_method = null where id = '2e000000-0000-4000-8000-000000000002'$q$)
    is not null);
select pg_temp.act_as_owner();

-- ---------------------------------------------------------------------------
-- Exclusão lógica e estorno
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date, paid_by, payment_method)
values
  ('2e000000-0000-4000-8000-000000000003', '2a000000-0000-4000-8000-000000000001',
   '2d000000-0000-4000-8000-000000000001', 'food', 80, date '2026-11-02', 'company', 'cash'),
  ('2e000000-0000-4000-8000-000000000004', '2a000000-0000-4000-8000-000000000001',
   '2d000000-0000-4000-8000-000000000001', 'lodging', 200, date '2026-11-02', 'aggregate', 'own_money');
update public.trip_expenses set deleted_at = now() where id = '2e000000-0000-4000-8000-000000000003';
update public.trip_expenses set deleted_at = now() where id = '2e000000-0000-4000-8000-000000000004';
select pg_temp.act_as_owner();

select pg_temp.expect('despesa paga excluída: original fica "reversed" e o estorno é gravado',
  (select count(*) = 1 from public.financial_entries
   where source_id = '2e000000-0000-4000-8000-000000000003' and entry_type = 'expense' and entry_status = 'reversed')
  and (select count(*) = 1 from public.financial_entries r
       join public.financial_entries o on o.id = r.reversed_entry_id
       where o.source_id = '2e000000-0000-4000-8000-000000000003'
         and r.entry_type = 'reversal' and r.amount = 80 and r.source_module = 'trip_expense'));
select pg_temp.expect('reembolso pendente excluído: lançamento cancelado, sem estorno',
  (select count(*) = 1 from public.financial_entries
   where source_id = '2e000000-0000-4000-8000-000000000004' and entry_status = 'cancelled')
  and not exists (select 1 from public.financial_entries
                  where source_id = '2e000000-0000-4000-8000-000000000004' and entry_type = 'reversal'));

-- ---------------------------------------------------------------------------
-- Terceiro, adiantamento e combinações
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date, paid_by, payment_method)
values
  ('2e000000-0000-4000-8000-000000000005', '2a000000-0000-4000-8000-000000000001',
   '2d000000-0000-4000-8000-000000000001', 'parking', 40, date '2026-11-02', 'third_party', null),
  ('2e000000-0000-4000-8000-000000000006', '2a000000-0000-4000-8000-000000000001',
   '2d000000-0000-4000-8000-000000000001', 'advance', 500, date '2026-11-02', 'company', 'cash'),
  ('2e000000-0000-4000-8000-000000000007', '2a000000-0000-4000-8000-000000000001',
   '2d000000-0000-4000-8000-000000000001', 'food', 60, date '2026-11-02', 'driver', 'driver_advance');
select pg_temp.expect('combinação inválida (motorista com tag) é recusada',
  pg_temp.error_of($q$insert into public.trip_expenses (company_id, trip_id, expense_type, amount, paid_by, payment_method)
    values ('2a000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'toll', 10, 'driver', 'toll_tag')$q$)
    like '%trip_expenses_payment_combination_check%');
select pg_temp.expect('compra a prazo sem vencimento é recusada',
  pg_temp.error_of($q$insert into public.trip_expenses (company_id, trip_id, expense_type, amount, paid_by, payment_method)
    values ('2a000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'tire_shop', 10, 'company', 'supplier_credit')$q$)
    like '%trip_expenses_supplier_credit_requires_due_date%');
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date, paid_by, payment_method, due_date)
values ('2e000000-0000-4000-8000-000000000008', '2a000000-0000-4000-8000-000000000001',
        '2d000000-0000-4000-8000-000000000001', 'tire_shop', 150, date '2026-11-02', 'company', 'supplier_credit', date '2026-12-02');
select pg_temp.act_as_owner();

select pg_temp.expect('despesa paga por terceiro não gera custo para a empresa',
  pg_temp.entries_of('2e000000-0000-4000-8000-000000000005') = 0);
select pg_temp.expect('despesa do tipo adiantamento nunca vira custo',
  pg_temp.entries_of('2e000000-0000-4000-8000-000000000006') = 0);
select pg_temp.expect('gasto com adiantamento nasce pago, sem segunda saída',
  (select entry_status = 'paid' and metadata ->> 'treatment' = 'paid_by_advance'
   from pg_temp.entry_of('2e000000-0000-4000-8000-000000000007')));
select pg_temp.expect('compra a prazo nasce pendente com o vencimento informado',
  (select entry_status = 'pending' and due_date = date '2026-12-02'
   from pg_temp.entry_of('2e000000-0000-4000-8000-000000000008')));

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
update public.trip_expenses set paid_by = 'third_party', payment_method = null
where id = '2e000000-0000-4000-8000-000000000007';
select pg_temp.act_as_owner();
select pg_temp.expect('passar para terceiro estorna o lançamento pago',
  pg_temp.entry_of('2e000000-0000-4000-8000-000000000007') is null
  and exists (select 1 from public.financial_entries
              where source_id = '2e000000-0000-4000-8000-000000000007' and entry_type = 'reversal'));

-- ---------------------------------------------------------------------------
-- Duplicidade (índice 109)
-- ---------------------------------------------------------------------------

select pg_temp.expect('segundo lançamento ativo para a mesma despesa é recusado pelo índice 109',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, entry_status, amount, source_module, source_id, installment_number)
    values ('2a000000-0000-4000-8000-000000000001', 'expense', 'pending', 1, 'trip_expense', '2e000000-0000-4000-8000-000000000008', 1)
  $q$) like '%idx_financial_entries_source_installment_active%');
select pg_temp.expect('reprocessar (salvar de novo) não cria lançamento',
  (select count(*) = 1 from public.financial_entries
   where source_id = '2e000000-0000-4000-8000-000000000008' and entry_type = 'expense'));

-- ---------------------------------------------------------------------------
-- Proteção contra alterações diretas
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date, paid_by, payment_method)
values ('2e000000-0000-4000-8000-00000000000a', '2a000000-0000-4000-8000-000000000001',
        '2d000000-0000-4000-8000-000000000001', 'ferry', 90, date '2026-11-02', 'company', 'bank_account');
select pg_temp.act_as('e2200000-0000-4000-8000-000000000001');
select pg_temp.expect('Financeiro não cria lançamento com origem despesa de viagem',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, amount, source_module, source_id)
    values ('2a000000-0000-4000-8000-000000000001', 'expense', 1, 'trip_expense', gen_random_uuid())
  $q$) like '%nascem da própria despesa%');
select pg_temp.expect('Financeiro não altera o valor do lançamento integrado',
  pg_temp.error_of($q$
    update public.financial_entries set amount = 1
    where source_id = '2e000000-0000-4000-8000-000000000008' and entry_type = 'expense'
  $q$) like '%controlado por ela%');
select pg_temp.expect('Financeiro não cancela o lançamento integrado',
  pg_temp.error_of($q$
    update public.financial_entries set entry_status = 'cancelled'
    where source_id = '2e000000-0000-4000-8000-000000000008' and entry_type = 'expense'
  $q$) like '%altere a despesa na viagem%');
select pg_temp.expect('Financeiro não mexe no pagamento de lançamento que já nasce pago',
  pg_temp.error_of($q$
    update public.financial_entries set paid_amount = 1
    where source_id = '2e000000-0000-4000-8000-00000000000a' and entry_type = 'expense'
  $q$) like '%já nasce pago%');
select pg_temp.expect('Financeiro não exclui o lançamento integrado',
  pg_temp.error_of($q$
    delete from public.financial_entries
    where source_id = '2e000000-0000-4000-8000-000000000008' and entry_type = 'expense'
  $q$) like '%não pode ser excluído%');
select pg_temp.expect('Financeiro não estorna direto o lançamento integrado',
  pg_temp.error_of($q$
    insert into public.financial_entries (company_id, entry_type, entry_status, amount, reversed_entry_id)
    select company_id, 'reversal', 'paid', amount, id from public.financial_entries
    where source_id = '2e000000-0000-4000-8000-000000000008' and entry_type = 'expense'
  $q$) like '%exclua ou altere a despesa%');
select pg_temp.expect('Financeiro ajusta vencimento e descrição do lançamento a prazo',
  pg_temp.error_of($q$
    update public.financial_entries set due_date = date '2026-12-10', description = 'Borracharia — ajuste'
    where source_id = '2e000000-0000-4000-8000-000000000008' and entry_type = 'expense'
  $q$) is null);
select pg_temp.act_as_owner();

-- ---------------------------------------------------------------------------
-- Isolamento entre empresas
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e2300000-0000-4000-8000-000000000001');
select pg_temp.expect('outra empresa não enxerga as despesas da empresa A',
  not exists (select 1 from public.trip_expenses where company_id = '2a000000-0000-4000-8000-000000000001'));
select pg_temp.expect('despesa não pode apontar para viagem de outra empresa',
  pg_temp.error_of($q$
    insert into public.trip_expenses (company_id, trip_id, expense_type, amount, paid_by, payment_method)
    values ('2b000000-0000-4000-8000-000000000001', '2d000000-0000-4000-8000-000000000001', 'toll', 10, 'company', 'cash')
  $q$) is not null);
insert into public.trip_expenses (id, company_id, trip_id, expense_type, amount, expense_date, paid_by, payment_method)
values ('2e000000-0000-4000-8000-000000000009', '2b000000-0000-4000-8000-000000000001',
        '2d000000-0000-4000-8000-000000000002', 'toll', 70, date '2026-11-02', 'company', 'cash');
select pg_temp.act_as_owner();
select pg_temp.expect('lançamento da empresa B fica na empresa B',
  (select company_id = '2b000000-0000-4000-8000-000000000001' and trip_id = '2d000000-0000-4000-8000-000000000002'
   from pg_temp.entry_of('2e000000-0000-4000-8000-000000000009')));
select pg_temp.expect('despesa não muda de empresa',
  pg_temp.error_of($q$
    update public.trip_expenses set company_id = '2a000000-0000-4000-8000-000000000001'
    where id = '2e000000-0000-4000-8000-000000000009'
  $q$) is not null);

-- ---------------------------------------------------------------------------
-- Compatibilidade com 109 e 110
-- ---------------------------------------------------------------------------

select pg_temp.act_as('e2200000-0000-4000-8000-000000000001');
-- Ativos na viagem A: 350 (reembolso pago) + 150 (a prazo) + 90 (balsa) = 590.
-- Excluídas, terceiro, adiantamento e a de 60 (virou terceiro) ficam fora.
select pg_temp.expect('view: custo de despesas de viagem e resultado batem com os lançamentos',
  (select trip_expense_costs = 590 and direct_costs = 590 and result = 9410
     and fuel_costs = 0 and maintenance_costs = 0 and tire_costs = 0 and other_costs = 0
   from public.trip_financial_summary where trip_id = '2d000000-0000-4000-8000-000000000001'));
select pg_temp.expect('view: só a despesa sem quem pagou continua fora do financeiro',
  (select unposted_trip_expenses_amount = 120 and unposted_trip_expenses_count = 1
   from public.trip_financial_summary where trip_id = '2d000000-0000-4000-8000-000000000001'));
select pg_temp.act_as('e2100000-0000-4000-8000-000000000001');
select pg_temp.expect('view: sem financeiro:read os custos continuam NULL',
  (select not financial_visible and trip_expense_costs is null and result is null
   from public.trip_financial_summary where trip_id = '2d000000-0000-4000-8000-000000000001'));
select pg_temp.act_as_owner();

-- ---------------------------------------------------------------------------
-- Exclusão física e reset da empresa de teste (RPCs 103/104)
-- ---------------------------------------------------------------------------

-- Sem as GUCs do reset, a exclusão física encerra o lançamento (estorno).
delete from public.trip_expenses where id = '2e000000-0000-4000-8000-00000000000a';
select pg_temp.expect('exclusão física da despesa paga estorna o lançamento',
  exists (select 1 from public.financial_entries
          where source_id = '2e000000-0000-4000-8000-00000000000a' and entry_type = 'expense' and entry_status = 'reversed')
  and exists (select 1 from public.financial_entries
              where source_id = '2e000000-0000-4000-8000-00000000000a' and entry_type = 'reversal'));

-- Com as GUCs do reset (como a RPC define), a exclusão passa direto: o reset
-- apaga os lançamentos da empresa no mesmo processo.
select set_config('app.allow_hml_company_reset', 'HML_RESET_COMPANY_BUSINESS', true);
select set_config('app.hml_expected_project_ref', 'aobfjjaucdrwybebosxm', true);
delete from public.trip_expenses where id = '2e000000-0000-4000-8000-000000000009';
select pg_temp.expect('no reset, excluir a despesa não estorna nem recria lançamento',
  (select entry_status = 'paid' from pg_temp.entry_of('2e000000-0000-4000-8000-000000000009'))
  and not exists (select 1 from public.financial_entries
                  where source_id = '2e000000-0000-4000-8000-000000000009' and entry_type = 'reversal'));

select pg_temp.act_as('e2200000-0000-4000-8000-000000000001');
select set_config('app.allow_hml_company_reset', 'HML_RESET_COMPANY_BUSINESS', true);
select set_config('app.hml_expected_project_ref', 'aobfjjaucdrwybebosxm', true);
select pg_temp.expect('no reset, os lançamentos integrados da empresa podem ser apagados',
  pg_temp.error_of($q$
    delete from public.financial_entries
    where company_id = '2a000000-0000-4000-8000-000000000001' and source_module = 'trip_expense'
  $q$) is null);
select set_config('app.allow_hml_company_reset', '', true);
select set_config('app.hml_expected_project_ref', '', true);
select pg_temp.act_as_owner();
select pg_temp.expect('o reset apagou só os lançamentos da empresa A',
  not exists (select 1 from public.financial_entries
              where company_id = '2a000000-0000-4000-8000-000000000001' and source_module = 'trip_expense')
  and exists (select 1 from public.financial_entries
              where company_id = '2b000000-0000-4000-8000-000000000001' and source_module = 'trip_expense'));

select seq, name, ok, detail from _e2_results order by seq;

do $$
declare
  v_failed int;
begin
  select count(*) into v_failed from _e2_results where not ok;
  if v_failed > 0 then
    raise exception 'Casos reprovados: %', v_failed;
  end if;
end;
$$;

rollback;
