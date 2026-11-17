-- FleetControl — Fase 1 (Números confiáveis): invariantes e diagnóstico em SQL.
--
-- SOMENTE LEITURA: apenas SELECT. Não cria objetos, não grava, não chama RPC.
-- Rode numa transação somente leitura para garantir:
--
--   begin transaction read only;
--   \set company_id '451a7940-a56b-425f-ae5f-e493d536591f'
--   \i database/tests/fase-1-consistency.sql
--   rollback;
--
-- Cada consulta "Ixx" lista violações: ao fim da Fase 1, todas devem voltar vazias.
-- As consultas "Dxx" são diagnóstico (contagens), não invariantes.
-- Requer as migrations 105 a 108 (trip_charge_key, adjustment_total, movimentos).

-- D1. Despesas da viagem por tipo e situação
select
  te.expense_type,
  case
    when te.deleted_at is not null then 'excluida'
    when t.id is null or t.deleted_at is not null then 'viagem_excluida'
    else 'ativa'
  end as situacao,
  count(*) as qtde,
  sum(te.amount) as total
from public.trip_expenses te
left join public.trips t on t.id = te.trip_id
where te.company_id = :'company_id'
group by 1, 2
order by 1, 2;

-- D2 / I6. Lançamentos pagos sem movimento
select
  coalesce(fe.source_module, '(sem origem)') as source_module,
  fe.entry_type,
  count(*) as qtde,
  sum(coalesce(fe.paid_amount, fe.amount)) as total
from public.financial_entries fe
where fe.company_id = :'company_id'
  and fe.deleted_at is null
  and fe.entry_status = 'paid'
  and not exists (
    select 1 from public.financial_entry_movements m where m.financial_entry_id = fe.id
  )
group by 1, 2
order by total desc;

-- D3 / I5. Duplicidades por origem (o que o futuro índice único recusaria)
select
  fe.source_module,
  fe.source_id,
  coalesce(fe.installment_number, 1) as parcela,
  count(*) as qtde,
  array_agg(fe.id order by fe.created_at) as lancamentos
from public.financial_entries fe
where fe.company_id = :'company_id'
  and fe.deleted_at is null
  and fe.entry_status not in ('cancelled', 'reversed')
  and fe.entry_type <> 'reversal'
  and fe.source_module is not null
  and fe.source_id is not null
group by 1, 2, 3
having count(*) > 1;

-- D4. Despesas de viagem relançadas à mão (candidatas)
select
  fe.id,
  fe.description,
  fe.amount,
  fe.entry_date,
  fc.slug as categoria,
  array_agg(te.id) filter (where te.id is not null) as despesas_candidatas
from public.financial_entries fe
left join public.financial_categories fc on fc.id = fe.category_id
left join public.trip_expenses te
  on te.company_id = fe.company_id
  and te.deleted_at is null
  and te.expense_type <> 'advance'
  and (
    (fe.trip_id is not null and te.trip_id = fe.trip_id)
    or (te.amount = fe.amount and abs(te.expense_date - fe.entry_date) <= 3)
  )
where fe.company_id = :'company_id'
  and fe.deleted_at is null
  and fe.entry_status not in ('cancelled', 'reversed')
  and fe.entry_type = 'expense'
  and (fe.source_module is null or fe.source_module in ('accounts_payable', 'manual', 'financeiro'))
  and (
    fc.slug in ('pedagio', 'alimentacao', 'hospedagem', 'diarias', 'multas')
    or fe.description ~* 'ped[aá]gio|balsa|alimenta|hosped|di[aá]ria|lavagem|estacionamento|multa'
  )
group by fe.id, fe.description, fe.amount, fe.entry_date, fc.slug;

-- D5. Adiantamentos antigos
select 'trip_expenses (advance)' as origem, count(*) as qtde, sum(amount) as total
from public.trip_expenses
where company_id = :'company_id' and deleted_at is null and expense_type = 'advance'
union all
select 'financial_entries (' || entry_type || ')', count(*), sum(amount)
from public.financial_entries
where company_id = :'company_id' and deleted_at is null and entry_type in ('advance', 'reimbursement')
group by entry_type;

-- D6. Movimentos por tipo (nenhum tem conta: a coluna ainda não existe)
select m.kind, count(*) as qtde, sum(m.amount) as total
from public.financial_entry_movements m
where m.company_id = :'company_id'
group by 1;

-- D7 / I1. Viagens: despesas da aba × custo de viagem na DRE × margem gravada
with aba as (
  select trip_id, sum(amount) as total
  from public.trip_expenses
  where company_id = :'company_id' and deleted_at is null and expense_type <> 'advance'
  group by 1
),
dre as (
  select trip_id, sum(amount) as total
  from public.financial_entries
  where company_id = :'company_id'
    and deleted_at is null
    and entry_type = 'expense'
    and entry_status not in ('cancelled', 'reversed')
    and trip_id is not null
  group by 1
)
select
  t.trip_number,
  t.trip_status,
  coalesce(t.actual_freight_value, t.contracted_freight_value, 0) as frete,
  coalesce(aba.total, 0) as despesas_aba,
  coalesce(dre.total, 0) as custo_dre,
  t.freight_margin as margem_gravada
from public.trips t
left join aba on aba.trip_id = t.id
left join dre on dre.trip_id = t.id
where t.company_id = :'company_id'
  and t.deleted_at is null
  and (
    coalesce(aba.total, 0) <> coalesce(dre.total, 0)
    or (
      t.trip_status = 'completed'
      and t.freight_margin is not null
      and t.freight_margin <> coalesce(t.actual_freight_value, t.contracted_freight_value, 0) - coalesce(dre.total, 0)
    )
  )
order by t.trip_number;

-- D8. Lançamento de abastecimento/manutenção no dia UTC, e não no dia de Brasília
select fe.id, 'fuel' as origem, fe.entry_date, (fr.fueled_at at time zone 'America/Sao_Paulo')::date as dia_brasilia
from public.financial_entries fe
join public.fuel_records fr on fr.id = fe.fuel_record_id
where fe.company_id = :'company_id'
  and fe.deleted_at is null
  and fe.source_module = 'fuel'
  and coalesce(fe.installment_number, 1) = 1
  and fe.entry_date <> (fr.fueled_at at time zone 'America/Sao_Paulo')::date
union all
select fe.id, 'maintenance', fe.entry_date,
  (coalesce(mr.completed_at, mr.opened_at) at time zone 'America/Sao_Paulo')::date
from public.financial_entries fe
join public.maintenance_records mr on mr.id = fe.maintenance_record_id
where fe.company_id = :'company_id'
  and fe.deleted_at is null
  and fe.source_module = 'maintenance'
  and coalesce(fe.installment_number, 1) = 1
  and fe.entry_date <> (coalesce(mr.completed_at, mr.opened_at) at time zone 'America/Sao_Paulo')::date;

-- D9. Integridade de vínculos
select 'lançamento com viagem inexistente' as verificacao, count(*) as qtde
from public.financial_entries fe
where fe.company_id = :'company_id' and fe.deleted_at is null and fe.trip_id is not null
  and not exists (select 1 from public.trips t where t.id = fe.trip_id)
union all
select 'lançamento ativo de viagem excluída', count(*)
from public.financial_entries fe
join public.trips t on t.id = fe.trip_id
where fe.company_id = :'company_id' and fe.deleted_at is null and t.deleted_at is not null
  and fe.entry_status not in ('cancelled', 'reversed')
union all
select 'cobrança de frete sem viagem (constraint NOT VALID da 105)', count(*)
from public.financial_entries fe
where fe.company_id = :'company_id' and fe.trip_charge_key is not null and fe.trip_id is null
union all
select 'despesa ativa em viagem excluída', count(*)
from public.trip_expenses te
join public.trips t on t.id = te.trip_id
where te.company_id = :'company_id' and te.deleted_at is null and t.deleted_at is not null
union all
select 'lançamento de abastecimento sem abastecimento', count(*)
from public.financial_entries fe
where fe.company_id = :'company_id' and fe.deleted_at is null and fe.fuel_record_id is not null
  and not exists (select 1 from public.fuel_records fr where fr.id = fe.fuel_record_id);

-- I8. paid_amount = recebimentos − estornos (títulos com movimento)
select fe.id, fe.paid_amount, mv.liquido
from public.financial_entries fe
join (
  select financial_entry_id,
    sum(case kind when 'receipt' then amount when 'receipt_reversal' then -amount else 0 end) as liquido
  from public.financial_entry_movements
  where company_id = :'company_id'
  group by 1
) mv on mv.financial_entry_id = fe.id
where fe.company_id = :'company_id'
  and coalesce(fe.paid_amount, 0) <> mv.liquido;

-- Catálogo: RLS e índices das tabelas da fase (leitura de pg_catalog)
select c.relname as tabela, c.relrowsecurity as rls_ativa, c.relforcerowsecurity as rls_forcada
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('financial_entries', 'financial_entry_movements', 'trip_expenses', 'trips');

select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('financial_entries', 'financial_entry_movements', 'trip_expenses')
order by tablename, indexname;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in ('financial_entries', 'financial_entry_movements', 'trip_expenses')
order by tablename, policyname;
