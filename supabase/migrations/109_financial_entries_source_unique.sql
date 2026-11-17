-- FleetControl — Fase 1, Etapa 1: um lançamento ativo por origem e parcela
-- Não altera dados. Se já houver duplicidade, a migration PARA com a lista dos
-- pares repetidos, para revisão manual; nada é apagado ou cancelado aqui.
--
-- Até aqui só abastecimento, manutenção e pneu (084) e folha (091) tinham
-- restrição, e só com installment_number preenchido. Este índice cobre toda
-- origem com source_id: contas de módulos, título de frete, receita legada de
-- viagem e as futuras despesas de viagem e adiantamentos (Etapas 2 e 4).
--
-- "Ativo" é o mesmo predicado da DRE e de get_financial_stats: sem exclusão
-- lógica, fora de cancelled e reversed, e sem contar o próprio estorno (que
-- carrega o source_module e o source_id do original).
-- Diagnóstico do HML em 2026-11-10: nenhuma duplicidade (invariante I5 = 0).

do $$
declare
  v_groups integer;
  v_sample text;
begin
  select count(*), string_agg(sample, '; ')
    into v_groups, v_sample
  from (
    select format(
             '%s/%s parcela %s: %s lançamentos',
             fe.source_module, fe.source_id, coalesce(fe.installment_number, 1), count(*)
           ) as sample
    from public.financial_entries fe
    where fe.source_id is not null
      and fe.source_module is not null
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
      and fe.entry_type <> 'reversal'
    group by fe.company_id, fe.source_module, fe.source_id, coalesce(fe.installment_number, 1)
    having count(*) > 1
    limit 20
  ) dup;

  if v_groups > 0 then
    raise exception
      'Migration 109 interrompida: % origem(ns) com mais de um lançamento ativo. Exemplos: %',
      v_groups, v_sample
      using hint = 'Revise as duplicidades com o diagnóstico da Fase 1 antes de aplicar.';
  end if;
end $$;

create unique index if not exists idx_financial_entries_source_installment_active
  on public.financial_entries (
    company_id,
    source_module,
    source_id,
    (coalesce(installment_number, 1))
  )
  where source_id is not null
    and source_module is not null
    and deleted_at is null
    and entry_status not in ('cancelled', 'reversed')
    and entry_type <> 'reversal';

comment on index public.idx_financial_entries_source_installment_active is
  'Fase 1: no máximo um lançamento ativo por (origem, parcela). Estorno, cancelado e excluído ficam fora.';
