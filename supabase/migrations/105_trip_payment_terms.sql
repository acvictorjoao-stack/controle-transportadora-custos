-- FleetControl — Condição de pagamento da viagem e chave do título de frete
-- Somente colunas e índices aditivos. Nenhuma linha existente é alterada:
-- viagens antigas ficam com payment_condition nulo e não geram título.

-- ---------------------------------------------------------------------------
-- trips: condição de pagamento
-- ---------------------------------------------------------------------------

alter table public.trips
  add column if not exists payment_condition text,
  add column if not exists payment_issue_date date,
  add column if not exists payment_due_date date,
  add column if not exists creation_request_id uuid;

alter table public.trips
  drop constraint if exists trips_payment_condition_check;

alter table public.trips
  add constraint trips_payment_condition_check
  check (payment_condition is null or payment_condition in ('advance', 'term'));

alter table public.trips
  drop constraint if exists trips_payment_condition_requires_due_date;

alter table public.trips
  add constraint trips_payment_condition_requires_due_date
  check (payment_condition is null or payment_due_date is not null);

alter table public.trips
  drop constraint if exists trips_term_requires_issue_date;

alter table public.trips
  add constraint trips_term_requires_issue_date
  check (payment_condition is distinct from 'term' or payment_issue_date is not null);

comment on column public.trips.payment_condition is
  'advance = frete antecipado; term = frete a prazo. Nulo = viagem sem cobrança gerada';
comment on column public.trips.payment_issue_date is
  'Data de emissão do título de frete';
comment on column public.trips.payment_due_date is
  'Vencimento do título (a prazo) ou data prevista de pagamento (antecipado)';
comment on column public.trips.creation_request_id is
  'Chave de idempotência do cadastro: repetir o envio não cria uma segunda viagem';

create unique index if not exists idx_trips_creation_request
  on public.trips (company_id, creation_request_id)
  where creation_request_id is not null;

-- ---------------------------------------------------------------------------
-- financial_entries: título de frete e ajustes
-- ---------------------------------------------------------------------------

alter table public.financial_entries
  add column if not exists trip_charge_key text,
  add column if not exists adjustment_total numeric(14, 2) not null default 0;

comment on column public.financial_entries.trip_charge_key is
  'Identifica a cobrança da viagem (freight). Nulo em títulos manuais e lançamentos antigos';
comment on column public.financial_entries.adjustment_total is
  'Soma dos ajustes rastreáveis. Valor efetivo = amount + adjustment_total';

alter table public.financial_entries
  drop constraint if exists financial_entries_trip_charge_requires_trip;

alter table public.financial_entries
  add constraint financial_entries_trip_charge_requires_trip
  check (trip_charge_key is null or trip_id is not null)
  not valid;

-- Linhas excluídas e canceladas continuam ocupando a chave: a mesma cobrança
-- nunca nasce duas vezes, mesmo após exclusão lógica.
create unique index if not exists idx_financial_entries_trip_charge
  on public.financial_entries (company_id, trip_id, trip_charge_key)
  where trip_charge_key is not null;

-- Alvo da FK composta de financial_entry_movements (isolamento por empresa).
create unique index if not exists idx_financial_entries_company_id_id
  on public.financial_entries (company_id, id);
