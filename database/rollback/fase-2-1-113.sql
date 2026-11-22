-- FleetControl — Reversão da migration 113 (Fase 2.1, reconciliação financeira)
-- NÃO é migration: só roda por decisão explícita.
--
-- A 113 só cria funções de leitura: não grava dados, não cria tabela nem
-- altera objeto existente. Reverter é remover as quatro funções; nada se perde.
-- Depois de rodar, marque a versão como revertida no histórico da CLI:
--   supabase migration repair --status reverted 113 --remote

begin;

drop function if exists public.financial_reconciliation_summary(uuid, date, date);
drop function if exists public.financial_reconciliation_findings(uuid, date, date, integer);
drop function if exists public.financial_reconciliation_ref_state(uuid, text, uuid);
drop function if exists public.financial_reconciliation_in_period(date, date, date);

commit;
