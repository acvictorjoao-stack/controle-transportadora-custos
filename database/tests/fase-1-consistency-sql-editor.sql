-- =============================================================================
-- FleetControl — Fase 1, Etapa 0: diagnóstico para o SQL Editor do Supabase
-- =============================================================================
--
-- ONDE RODAR: somente no projeto de homologação aobfjjaucdrwybebosxm.
--   Confira na barra de endereço do painel: .../project/aobfjjaucdrwybebosxm/sql
--   Em qualquer outro projeto, NÃO execute.
--
-- EMPRESA: 451a7940-a56b-425f-ae5f-e493d536591f (fixa no bloco "p" abaixo).
--
-- SOMENTE LEITURA: é um único SELECT. Não cria objetos, não grava, não chama
-- RPC nem função que altere dados. Lê tabelas da empresa e o catálogo do
-- Postgres (pg_class, pg_policies, pg_indexes, pg_proc, information_schema).
--
-- COMO USAR: rode a PARTE 1 e depois a PARTE 2 (veja abaixo). O editor mostra
-- o resultado da última instrução; por isso cada parte é um único SELECT. A
-- PARTE 2 sai numa só tabela, com as colunas:
--   ordem        assunto, na ordem do relatório (0 a 10)
--   assunto      grupo da verificação
--   verificacao  o que foi medido
--   qtde         quantidade encontrada
--   total        soma em R$ (quando faz sentido)
--   esperado     o que se espera hoje, ou ao fim da Fase 1
--   exemplos     até alguns ids, números de viagem ou nomes
-- Use "Export > CSV" para me enviar o resultado.
--
-- SE DER ERRO "column ... does not exist": as migrations 105 a 108 não estão
-- aplicadas por completo nesse banco. Me avise antes de qualquer outro passo.
--
-- ESTE ARQUIVO TEM DUAS PARTES. Rode uma de cada vez:
--   PARTE 1  conferência do banco. Lê só o catálogo do Postgres e nunca falha
--            por tabela ausente. Diz em que banco você está e quais tabelas
--            existem.
--   PARTE 2  diagnóstico da Etapa 0. Só faz sentido se a PARTE 1 mostrar as
--            tabelas do FleetControl e a empresa.
-- No SQL Editor, selecione apenas o trecho da parte (do marcador "INÍCIO" ao
-- "FIM") e clique em Run: com texto selecionado, o editor roda só a seleção.
-- =============================================================================


-- ===== PARTE 1 — INÍCIO: conferência do banco =================================
--
-- Somente leitura. Usa pg_class, pg_namespace, pg_attribute e to_regclass.
-- As contagens da empresa usam query_to_xml, que apenas executa um SELECT
-- count(*); ele só roda quando a tabela existe, por isso não há erro 42P01.
--
-- Colunas: ordem, secao, item, resultado, esperado.
-- Como ler:
--   - "Supabase (auth.users)" = não: este banco não é de um projeto Supabase.
--   - companies ausente ou schema public quase vazio: projeto errado ou vazio.
--     Confira a URL (.../project/aobfjjaucdrwybebosxm/sql) e pare.
--   - companies presente e trips ausente: migrations aplicadas só até antes
--     da 041. Pare e me avise.
--   - tabelas parecidas em outro schema: me envie o resultado; não adapto o
--     diagnóstico sem ver a estrutura real.
--   - tudo "sim" e a empresa encontrada: pode rodar a PARTE 2.

with
p1 as (
  select '451a7940-a56b-425f-ae5f-e493d536591f'::uuid as company_id
),
esperado(ordem, objeto, migration) as (
  values
    (1,  'public.companies',                 '004'),
    (2,  'public.trips',                     '041'),
    (3,  'public.trip_expenses',             '041'),
    (4,  'public.fuel_records',              '046'),
    (5,  'public.maintenance_records',       '051'),
    (6,  'public.tires',                     '056'),
    (7,  'public.financial_categories',      '062'),
    (8,  'public.financial_entries',         '062'),
    (9,  'public.customers',                 '067'),
    (10, 'public.suppliers',                 '085'),
    (11, 'public.payroll_expenses',          '091'),
    (12, 'public.financial_entry_movements', '106'),
    (13, 'public.financial_cash_flow_lines', '108')
),
objetos as (
  select
    e.ordem,
    e.objeto,
    e.migration,
    to_regclass(e.objeto) as rel,
    exists (
      select 1 from pg_attribute a
      where a.attrelid = to_regclass(e.objeto)
        and a.attname = case when e.objeto = 'public.companies' then 'id' else 'company_id' end
        and not a.attisdropped
    ) as tem_coluna_empresa
  from esperado e
),
contagem as (
  select
    o.*,
    case
      when o.rel is not null and o.tem_coluna_empresa then
        (xpath('//n/text()', query_to_xml(
          format(
            'select count(*) as n from %s where %I = %L',
            o.objeto,
            case when o.objeto = 'public.companies' then 'id' else 'company_id' end,
            (select company_id from p1)
          ),
          false, false, ''
        )))[1]::text
    end as linhas_empresa
  from objetos o
),
schemas as (
  select
    n.nspname as schema_name,
    count(*) filter (where c.relkind in ('r', 'p')) as tabelas,
    count(*) filter (where c.relkind in ('v', 'm')) as views,
    string_agg(c.relname::text, ', ' order by c.relname) filter (where c.relkind in ('r', 'p')) as nomes
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm')
    and n.nspname not in ('pg_catalog', 'information_schema')
    and n.nspname not like 'pg\_toast%'
    and n.nspname not like 'pg\_temp%'
  group by n.nspname
),
parecidas as (
  select string_agg(n.nspname || '.' || c.relname, ', ' order by n.nspname, c.relname) as nomes,
         count(*) as qtde
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p', 'v', 'm')
    and n.nspname not in ('pg_catalog', 'information_schema')
    and n.nspname not like 'pg\_%'
    and c.relname ~* '(trip|viag|frete|freight|financ|despes|expense|fuel|abastec|mainten|manut)'
)
select 1 as ordem, 'A Banco' as secao, 'banco e usuário da sessão' as item,
       current_database() || ' / ' || current_user as resultado,
       'postgres / postgres' as esperado
union all
select 1, 'A Banco', 'versão do Postgres', current_setting('server_version'), 'qualquer'
union all
select 1, 'A Banco', 'Supabase (auth.users)',
       case when to_regclass('auth.users') is not null then 'sim' else 'não' end, 'sim'
union all
select 1, 'A Banco', 'histórico de migrations do CLI (supabase_migrations)',
       case
         when to_regclass('supabase_migrations.schema_migrations') is null then 'tabela ausente'
         else (xpath('//n/text()', query_to_xml(
           'select count(*)::text || '' registro(s); maior versão: '' || coalesce(max(version)::text, ''-'') as n from supabase_migrations.schema_migrations',
           false, false, ''
         )))[1]::text
       end,
       'informativo: as migrations do projeto podem ter sido aplicadas fora do CLI'
union all
select 2, 'B Objetos do FleetControl',
       c.objeto || ' (migration ' || c.migration || ')',
       case when c.rel is null then 'NÃO existe' else 'existe' end,
       'existe'
from contagem c
union all
select 3, 'C Empresa 451a7940',
       c.objeto,
       coalesce(c.linhas_empresa, case when c.rel is null then 'tabela ausente' else 'sem company_id' end),
       case when c.objeto = 'public.companies' then '1' else '0 ou mais' end
from contagem c
union all
select 3, 'C Empresa 451a7940', 'nome da empresa',
       case
         when to_regclass('public.companies') is null then 'tabela ausente'
         else coalesce((xpath('//n/text()', query_to_xml(
           format(
             'select coalesce(trade_name, legal_name) || '' ('' || coalesce(slug, ''-'') || '')'' as n from public.companies where id = %L',
             (select company_id from p1)
           ),
           false, false, ''
         )))[1]::text, 'não encontrada')
       end,
       'empresa de homologação'
union all
select 4, 'D Schemas', s.schema_name::text,
       s.tabelas || ' tabela(s), ' || s.views || ' view(s): ' || left(coalesce(s.nomes, '-'), 1500),
       case when s.schema_name = 'public' then 'tabelas do FleetControl (trips, financial_entries…)' else 'informativo' end
from schemas s
union all
select 5, 'E Tabelas parecidas (qualquer schema)', 'nomes com trip/financ/expense/fuel/manut…',
       coalesce(p.qtde, 0) || ': ' || coalesce(p.nomes, '-'),
       'em public: trips, trip_expenses, financial_entries…'
from parecidas p
order by 1, 2, 3;

-- ===== PARTE 1 — FIM ==========================================================


-- ===== PARTE 2 — INÍCIO: diagnóstico da Etapa 0 ===============================
-- Rode só depois que a PARTE 1 mostrar todas as tabelas e a empresa.

with
p as (
  select '451a7940-a56b-425f-ae5f-e493d536591f'::uuid as company_id
),
tr as (
  select t.* from public.trips t, p where t.company_id = p.company_id
),
te as (
  select x.* from public.trip_expenses x, p where x.company_id = p.company_id
),
fe as (
  select f.* from public.financial_entries f, p where f.company_id = p.company_id
),
mv as (
  select m.* from public.financial_entry_movements m, p where m.company_id = p.company_id
),
cat as (
  select c.id, c.slug::text as slug
  from public.financial_categories c, p
  where c.company_id = p.company_id
),
-- Mesmas exclusões da DRE e de get_financial_stats.
fe_active as (
  select * from fe
  where deleted_at is null
    and entry_status::text not in ('cancelled', 'reversed')
    and entry_type::text <> 'reversal'
),
moved as (
  select distinct financial_entry_id from mv
),
-- Despesas da aba, sem adiantamento, por viagem.
aba as (
  select trip_id, sum(amount) as total
  from te
  where deleted_at is null and expense_type::text <> 'advance'
  group by trip_id
),
-- Custo que a DRE vincula à viagem.
dre as (
  select trip_id, sum(amount) as total
  from fe_active
  where entry_type::text = 'expense' and trip_id is not null
  group by trip_id
),
viagens as (
  select
    t.id,
    t.trip_number,
    t.trip_status::text as trip_status,
    coalesce(t.actual_freight_value, t.contracted_freight_value, 0) as frete,
    coalesce(aba.total, 0) as despesas_aba,
    coalesce(dre.total, 0) as custo_dre,
    t.freight_margin
  from tr t
  left join aba on aba.trip_id = t.id
  left join dre on dre.trip_id = t.id
  where t.deleted_at is null
),
-- Lançamentos manuais com cara de despesa de viagem.
relancados as (
  select
    f.id,
    f.description,
    f.amount,
    exists (
      select 1 from te x
      where x.deleted_at is null
        and x.expense_type::text <> 'advance'
        and (
          (f.trip_id is not null and x.trip_id = f.trip_id)
          or (x.amount = f.amount and abs(x.expense_date - f.entry_date) <= 3)
        )
    ) as tem_par_na_aba
  from fe_active f
  left join cat on cat.id = f.category_id
  where f.entry_type::text = 'expense'
    and (f.source_module is null or f.source_module in ('accounts_payable', 'manual', 'financeiro'))
    and (
      cat.slug in ('pedagio', 'alimentacao', 'hospedagem', 'diarias', 'multas')
      or coalesce(f.description, '') ~* 'ped[aá]gio|balsa|alimenta|hosped|di[aá]ria|lavagem|estacionamento|multa'
    )
),
-- Fluxo de Caixa como a tela calcula hoje (sem saldo inicial).
caixa as (
  select
    l.*,
    (l.source_module = 'accounts_receivable' or l.entry_type::text = 'revenue') as e_receber,
    (l.source_module = 'accounts_payable' or l.entry_type::text = 'expense') as e_pagar
  from public.financial_cash_flow_lines l, p
  where l.company_id = p.company_id and l.deleted_at is null
),
-- paid_amount × movimentos (títulos que têm movimento).
liquido as (
  select
    financial_entry_id,
    sum(case kind when 'receipt' then amount when 'receipt_reversal' then -amount else 0 end) as valor
  from mv
  group by financial_entry_id
),
-- Lançamento no dia UTC em vez do dia de Brasília.
datas as (
  select f.id, 'fuel'::text as origem
  from fe f
  join public.fuel_records r on r.id = f.fuel_record_id
  where f.deleted_at is null
    and f.source_module = 'fuel'
    and coalesce(f.installment_number, 1) = 1
    and f.entry_date <> (r.fueled_at at time zone 'America/Sao_Paulo')::date
  union all
  select f.id, 'maintenance'
  from fe f
  join public.maintenance_records r on r.id = f.maintenance_record_id
  where f.deleted_at is null
    and f.source_module = 'maintenance'
    and coalesce(f.installment_number, 1) = 1
    and f.entry_date <> (coalesce(r.completed_at, r.opened_at) at time zone 'America/Sao_Paulo')::date
),
resultado as (

  -- ===========================================================================
  -- 0. Ambiente: empresa e migrations 105 a 108
  -- Esperado: empresa encontrada; colunas e objetos da 105–108 presentes;
  -- bank_accounts e bank_account_id ainda ausentes (Etapa 3).
  -- ===========================================================================
  select 0 as ordem, 'Ambiente'::text as assunto, 'Empresa encontrada'::text as verificacao,
    count(*)::bigint as qtde, null::numeric as total, '1'::text as esperado,
    max(coalesce(c.trade_name, c.legal_name) || ' (' || c.slug || ')')::text as exemplos
  from public.companies c, p where c.id = p.company_id

  union all
  select 0, 'Ambiente', 'Migration 105: trips.payment_condition', count(*), null, '1', null
  from information_schema.columns
  where table_schema = 'public' and table_name = 'trips' and column_name = 'payment_condition'

  union all
  select 0, 'Ambiente', 'Migration 105: financial_entries.trip_charge_key e adjustment_total', count(*), null, '2', null
  from information_schema.columns
  where table_schema = 'public' and table_name = 'financial_entries'
    and column_name in ('trip_charge_key', 'adjustment_total')

  union all
  select 0, 'Ambiente', 'Migration 106: tabela financial_entry_movements', count(*), null, '1', null
  from information_schema.tables
  where table_schema = 'public' and table_name = 'financial_entry_movements'

  union all
  select 0, 'Ambiente', 'Migration 107: triggers trips_sync_receivable e financial_entries_guard_receivable', count(*), null, '2', null
  from pg_trigger
  where not tgisinternal and tgname in ('trips_sync_receivable', 'financial_entries_guard_receivable')

  union all
  select 0, 'Ambiente', 'Migration 108: view financial_cash_flow_lines', count(*), null, '1', null
  from information_schema.views
  where table_schema = 'public' and table_name = 'financial_cash_flow_lines'

  union all
  select 0, 'Ambiente', 'Constraint trip_charge_requires_trip ainda NOT VALID (criada assim na 105)', count(*), null, '1 (precisa validar depois)', null
  from pg_constraint
  where conname = 'financial_entries_trip_charge_requires_trip' and not convalidated

  union all
  select 0, 'Ambiente', 'Tabela bank_accounts (Etapa 3)', count(*), null, '0 (ainda não existe)', null
  from information_schema.tables
  where table_schema = 'public' and table_name = 'bank_accounts'

  union all
  select 0, 'Ambiente', 'Coluna financial_entry_movements.bank_account_id (Etapa 3)', count(*), null, '0 (ainda não existe)', null
  from information_schema.columns
  where table_schema = 'public' and table_name = 'financial_entry_movements' and column_name = 'bank_account_id'

  -- ===========================================================================
  -- 1. Despesas da viagem por tipo e situação
  -- Esperado: informativo. Hoje nenhuma despesa ativa tem lançamento financeiro.
  -- ===========================================================================
  union all
  select 1, 'Despesas da viagem',
    x.expense_type::text || ' · ' ||
      case
        when x.deleted_at is not null then 'excluída'
        when t.id is null or t.deleted_at is not null then 'viagem excluída'
        else 'ativa'
      end,
    count(*), sum(x.amount), 'Informativo', null
  from te x
  left join tr t on t.id = x.trip_id
  group by x.expense_type,
    case
      when x.deleted_at is not null then 'excluída'
      when t.id is null or t.deleted_at is not null then 'viagem excluída'
      else 'ativa'
    end

  union all
  select 1, 'Despesas da viagem', 'Despesas ativas (sem adiantamento) sem lançamento trip_expense',
    count(*), sum(x.amount), 'Hoje = todas; 0 ao fim da Etapa 2b', null
  from te x
  where x.deleted_at is null and x.expense_type::text <> 'advance'
    and not exists (
      select 1 from fe_active f where f.source_module = 'trip_expense' and f.source_id = x.id
    )

  -- ===========================================================================
  -- 2. Pagamentos e recebimentos: títulos pagos sem movimento
  -- Esperado: hoje, todos os pagamentos de contas a pagar e lançamentos à vista;
  -- 0 ao fim da Etapa 3b.
  -- ===========================================================================
  union all
  select 2, 'Pagamentos e recebimentos',
    'Pago sem movimento · ' || coalesce(f.source_module, '(sem origem)') || ' · ' || f.entry_type::text,
    count(*), sum(coalesce(f.paid_amount, f.amount)), '0 ao fim da Etapa 3b', null
  from fe f
  where f.deleted_at is null and f.entry_status::text = 'paid'
    and not exists (select 1 from moved m where m.financial_entry_id = f.id)
  group by f.source_module, f.entry_type

  union all
  select 2, 'Pagamentos e recebimentos', 'Títulos com pelo menos um movimento', count(*), null, 'Informativo', null
  from moved

  union all
  select 2, 'Pagamentos e recebimentos', 'paid_amount diferente da soma dos movimentos (I8)',
    count(*), null, '0',
    left(string_agg(f.id::text, ', '), 300)
  from fe f
  join liquido l on l.financial_entry_id = f.id
  where coalesce(f.paid_amount, 0) <> l.valor

  -- ===========================================================================
  -- 3. Duplicidades por origem
  -- Esperado: 0 em todas. "Parcela nula" mostra o que os índices únicos da
  -- migration 084 não cobrem (eles exigem installment_number preenchido).
  -- ===========================================================================
  union all
  select 3, 'Duplicidades', 'Mesma origem e parcela (source_module, source_id)',
    count(*), null, '0', left(string_agg(d.chave, ', '), 300)
  from (
    select source_module || ':' || source_id::text || ':' || coalesce(installment_number, 1) as chave
    from fe_active
    where source_module is not null and source_id is not null
    group by source_module, source_id, coalesce(installment_number, 1)
    having count(*) > 1
  ) d

  union all
  select 3, 'Duplicidades', 'Mesmo abastecimento e parcela', count(*), null, '0', left(string_agg(d.chave, ', '), 300)
  from (
    select fuel_record_id::text || ':' || coalesce(installment_number, 1) as chave
    from fe_active where fuel_record_id is not null
    group by fuel_record_id, coalesce(installment_number, 1) having count(*) > 1
  ) d

  union all
  select 3, 'Duplicidades', 'Mesma manutenção e parcela', count(*), null, '0', left(string_agg(d.chave, ', '), 300)
  from (
    select maintenance_record_id::text || ':' || coalesce(installment_number, 1) as chave
    from fe_active where maintenance_record_id is not null
    group by maintenance_record_id, coalesce(installment_number, 1) having count(*) > 1
  ) d

  union all
  select 3, 'Duplicidades', 'Mesmo pneu e parcela (origem tires)', count(*), null, '0', left(string_agg(d.chave, ', '), 300)
  from (
    select tire_id::text || ':' || coalesce(installment_number, 1) as chave
    from fe_active where tire_id is not null and source_module = 'tires'
    group by tire_id, coalesce(installment_number, 1) having count(*) > 1
  ) d

  union all
  select 3, 'Duplicidades', 'Mesma cobrança de frete (trip_id, trip_charge_key)', count(*), null, '0', left(string_agg(d.chave, ', '), 300)
  from (
    select trip_id::text || ':' || trip_charge_key as chave
    from fe where trip_charge_key is not null
    group by trip_id, trip_charge_key having count(*) > 1
  ) d

  union all
  select 3, 'Duplicidades', 'Lançamentos de abastecimento/manutenção/pneu com parcela nula (fora dos índices da 084)',
    count(*), sum(amount), 'Informativo; idealmente 0', null
  from fe
  where deleted_at is null and installment_number is null
    and (fuel_record_id is not null or maintenance_record_id is not null or tire_id is not null)

  -- ===========================================================================
  -- 4. Despesas de viagem relançadas à mão em Contas a Pagar
  -- Esperado: informativo. Os que têm par na aba seriam contados duas vezes
  -- se migrados sem revisão (o backfill 2b deve pular esses casos).
  -- ===========================================================================
  union all
  select 4, 'Relançamentos manuais', 'Contas manuais com cara de despesa de viagem',
    count(*), sum(amount), 'Informativo', left(string_agg(coalesce(description, id::text), ' | '), 300)
  from relancados

  union all
  select 4, 'Relançamentos manuais', 'Dessas, com despesa correspondente na aba (risco de dupla contagem)',
    count(*), sum(amount), 'Revisar antes do backfill', left(string_agg(id::text, ', '), 300)
  from relancados where tem_par_na_aba

  -- ===========================================================================
  -- 5. Adiantamentos antigos
  -- Esperado: adiantamentos só como despesa da aba; nenhum lançamento
  -- advance ou reimbursement no financeiro (nenhum código grava esses tipos).
  -- ===========================================================================
  union all
  select 5, 'Adiantamentos', 'Despesas da aba do tipo adiantamento (ativas)',
    count(*), sum(amount), 'Informativo; viram adiantamento na Etapa 4', null
  from te where deleted_at is null and expense_type::text = 'advance'

  union all
  select 5, 'Adiantamentos', 'Viagens com adiantamento lançado na aba',
    count(distinct trip_id), null, 'Informativo',
    left(string_agg(distinct t.trip_number, ', '), 300)
  from te x
  left join tr t on t.id = x.trip_id
  where x.deleted_at is null and x.expense_type::text = 'advance'

  union all
  select 5, 'Adiantamentos', 'Lançamentos financeiros ' || entry_type::text,
    count(*), sum(amount), '0 hoje', null
  from fe
  where deleted_at is null and entry_type::text in ('advance', 'reimbursement')
  group by entry_type

  -- ===========================================================================
  -- 6. Contas e movimentos
  -- Esperado: nenhum movimento tem conta (a coluna não existe); recebimentos
  -- têm movimento, pagamentos não.
  -- ===========================================================================
  union all
  select 6, 'Contas e movimentos', 'Movimentos ' || kind || ' (todos sem conta bancária)',
    count(*), sum(amount), 'Informativo; ganham conta na Etapa 3b', null
  from mv
  group by kind

  union all
  select 6, 'Contas e movimentos', 'Títulos pagos sem movimento (total)',
    count(*), sum(coalesce(paid_amount, amount)), '0 ao fim da Etapa 3b', null
  from fe f
  where f.deleted_at is null and f.entry_status::text = 'paid'
    and not exists (select 1 from moved m where m.financial_entry_id = f.id)

  union all
  select 6, 'Contas e movimentos', 'Movimento sem título correspondente', count(*), null, '0', left(string_agg(m.id::text, ', '), 300)
  from mv m
  where not exists (select 1 from fe f where f.id = m.financial_entry_id)

  -- ===========================================================================
  -- 7. Divergências entre viagem, DRE, margem e Fluxo de Caixa
  -- Esperado hoje: divergências onde há despesa na aba ou custo vinculado.
  -- Ao fim da Etapa 2: 0 viagens com aba diferente da DRE.
  -- ===========================================================================
  union all
  select 7, 'Divergências', 'Viagens em que a aba Despesas difere do custo na DRE',
    count(*), sum(abs(despesas_aba - custo_dre)), '0 ao fim da Etapa 2',
    left(string_agg(trip_number, ', '), 300)
  from viagens where despesas_aba <> custo_dre

  union all
  select 7, 'Divergências', 'Viagens concluídas com margem gravada diferente de frete − custo DRE',
    count(*), sum(abs(freight_margin - (frete - custo_dre))), '0 (margem deixa de ser gravada na Etapa 1)',
    left(string_agg(trip_number, ', '), 300)
  from viagens
  where trip_status = 'completed' and freight_margin is not null
    and freight_margin <> frete - custo_dre

  union all
  select 7, 'Divergências', 'Total da aba Despesas (ativas, sem adiantamento)',
    count(*), sum(despesas_aba), 'Comparar com a linha seguinte', null
  from viagens where despesas_aba <> 0

  union all
  select 7, 'Divergências', 'Total de custos financeiros vinculados a viagens (DRE)',
    count(*), sum(custo_dre), 'Comparar com a linha anterior', null
  from viagens where custo_dre <> 0

  union all
  select 7, 'Divergências', 'Fluxo de Caixa (tela): entradas recebidas', count(*), sum(line_amount), 'Informativo', null
  from caixa where line_status::text = 'paid' and e_receber

  union all
  select 7, 'Divergências', 'Fluxo de Caixa (tela): saídas pagas', count(*), sum(line_amount), 'Informativo', null
  from caixa where line_status::text = 'paid' and e_pagar

  union all
  select 7, 'Divergências', 'Fluxo de Caixa (tela): "Saldo Atual" sem saldo inicial',
    null, sum(case when e_receber then line_amount else 0 end) - sum(case when e_pagar then line_amount else 0 end),
    'Não corresponde a conta real até a Etapa 3', null
  from caixa where line_status::text = 'paid'

  union all
  select 7, 'Divergências', 'Fluxo de Caixa: linhas ignoradas pelo resumo · ' || entry_type::text,
    count(*), sum(line_amount), 'Informativo', null
  from caixa where not e_receber and not e_pagar
  group by entry_type

  -- ===========================================================================
  -- 8. Datas de lançamento fora do dia de Brasília
  -- Esperado: informativo. Corrigido no código (Etapa 0) só para novos
  -- lançamentos; os antigos não são alterados nesta etapa.
  -- ===========================================================================
  union all
  select 8, 'Datas', 'Lançamento de ' || origem || ' no dia UTC',
    count(*), null, 'Informativo', left(string_agg(id::text, ', '), 300)
  from datas
  group by origem

  -- ===========================================================================
  -- 9. Integridade de vínculos
  -- Esperado: 0 em todas.
  -- ===========================================================================
  union all
  select 9, 'Integridade', 'Lançamento com viagem inexistente', count(*), null, '0', left(string_agg(f.id::text, ', '), 300)
  from fe f
  where f.deleted_at is null and f.trip_id is not null
    and not exists (select 1 from public.trips t where t.id = f.trip_id)

  union all
  select 9, 'Integridade', 'Lançamento ativo de viagem excluída', count(*), sum(f.amount), '0', left(string_agg(f.id::text, ', '), 300)
  from fe_active f
  join public.trips t on t.id = f.trip_id
  where t.deleted_at is not null

  union all
  select 9, 'Integridade', 'Cobrança de frete sem viagem (o que a constraint NOT VALID deixaria passar)',
    count(*), sum(amount), '0', left(string_agg(id::text, ', '), 300)
  from fe where trip_charge_key is not null and trip_id is null

  union all
  select 9, 'Integridade', 'Despesa ativa em viagem excluída', count(*), sum(x.amount), '0', left(string_agg(x.id::text, ', '), 300)
  from te x
  join public.trips t on t.id = x.trip_id
  where x.deleted_at is null and t.deleted_at is not null

  union all
  select 9, 'Integridade', 'Lançamento de abastecimento sem abastecimento', count(*), null, '0', left(string_agg(f.id::text, ', '), 300)
  from fe f
  where f.deleted_at is null and f.fuel_record_id is not null
    and not exists (select 1 from public.fuel_records r where r.id = f.fuel_record_id)

  union all
  select 9, 'Integridade', 'Lançamento de manutenção sem manutenção', count(*), null, '0', left(string_agg(f.id::text, ', '), 300)
  from fe f
  where f.deleted_at is null and f.maintenance_record_id is not null
    and not exists (select 1 from public.maintenance_records r where r.id = f.maintenance_record_id)

  -- ===========================================================================
  -- 10. Segurança: RLS, políticas, índices e funções
  -- Esperado: RLS ativa nas 4 tabelas; anon sem SELECT em movimentos;
  -- 9 índices únicos presentes; 0 funções security definer sem search_path.
  -- ===========================================================================
  union all
  select 10, 'Segurança', 'RLS ativa · ' || c.relname::text,
    (case when c.relrowsecurity then 1 else 0 end)::bigint, null, '1', null
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('financial_entries', 'financial_entry_movements', 'trip_expenses', 'trips')

  union all
  select 10, 'Segurança', 'Políticas RLS · ' || tablename::text,
    count(*), null, 'Informativo', left(string_agg(policyname::text || ' (' || cmd || ')', ', '), 300)
  from pg_policies
  where schemaname = 'public'
    and tablename in ('financial_entries', 'financial_entry_movements', 'trip_expenses')
  group by tablename

  union all
  select 10, 'Segurança', 'Papel anon pode ler financial_entry_movements',
    (case when has_table_privilege('anon', 'public.financial_entry_movements', 'SELECT') then 1 else 0 end)::bigint,
    null, '0 (revogado na 106)', null

  union all
  select 10, 'Segurança', 'Índices únicos esperados presentes',
    count(*), null, '9',
    'faltando: ' || coalesce((
      select string_agg(e.nome, ', ')
      from unnest(array[
        'idx_financial_entries_fuel_installment_active',
        'idx_financial_entries_maintenance_installment_active',
        'idx_financial_entries_tire_installment_active',
        'idx_financial_entries_payroll_source_active',
        'idx_financial_entries_single_reversal',
        'idx_financial_entries_trip_charge',
        'idx_financial_entries_company_id_id',
        'idx_financial_entry_movements_idempotency',
        'idx_financial_entry_movements_single_reversal'
      ]) as e(nome)
      where not exists (select 1 from pg_indexes i where i.schemaname = 'public' and i.indexname = e.nome)
    ), 'nenhum')
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'idx_financial_entries_fuel_installment_active',
      'idx_financial_entries_maintenance_installment_active',
      'idx_financial_entries_tire_installment_active',
      'idx_financial_entries_payroll_source_active',
      'idx_financial_entries_single_reversal',
      'idx_financial_entries_trip_charge',
      'idx_financial_entries_company_id_id',
      'idx_financial_entry_movements_idempotency',
      'idx_financial_entry_movements_single_reversal'
    )

  union all
  select 10, 'Segurança', 'Funções security definer sem search_path fixo (schema public)',
    count(*), null, '0', left(string_agg(pr.proname::text, ', '), 300)
  from pg_proc pr
  join pg_namespace n on n.oid = pr.pronamespace
  where n.nspname = 'public'
    and pr.prosecdef
    and not exists (
      select 1 from unnest(coalesce(pr.proconfig, array[]::text[])) as cfg(v)
      where cfg.v like 'search_path=%'
    )
)
select *
from resultado
order by ordem, assunto, verificacao;

-- ===== PARTE 2 — FIM ==========================================================
