-- RC 28.0.2 — Lead Time e Tempo de Descarga obrigatórios em novas rotas.
-- Não preenche registros existentes. Null continua permitido para cadastros antigos.

alter table public.routes
  drop constraint if exists routes_lead_time_non_negative;

alter table public.routes
  drop constraint if exists routes_unload_time_non_negative;

alter table public.routes
  add constraint routes_lead_time_positive
    check (lead_time_minutes is null or lead_time_minutes >= 1);

alter table public.routes
  add constraint routes_unload_time_positive
    check (unload_time_minutes is null or unload_time_minutes >= 1);

comment on column public.routes.lead_time_minutes is
  'Tempo previsto (minutos) entre saída da origem e chegada ao destino. Obrigatório em novas rotas (RC 28.0.2).';

comment on column public.routes.unload_time_minutes is
  'Tempo médio previsto (minutos) para descarga no destino. Obrigatório em novas rotas (RC 28.0.2).';

create index if not exists idx_routes_missing_lead_time
  on public.routes (company_id)
  where deleted_at is null and lead_time_minutes is null;

create index if not exists idx_routes_missing_unload_time
  on public.routes (company_id)
  where deleted_at is null and unload_time_minutes is null;
