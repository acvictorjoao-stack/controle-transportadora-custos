-- FleetControl — reset transacional dos dados de NEGÓCIO da empresa HML
-- ---------------------------------------------------------------------------
-- PREPARADA LOCALMENTE. NÃO aplicar nem invocar sem autorização humana explícita.
--
-- Preferível ao hard-delete dos 43 IDs do manifesto parcial (migration 102):
-- limpa toda a superfície de negócio fictícia da empresa-alvo e deixa empty-guards
-- do seed verdes, preservando empresa / HQ / sistema / auth / roles / members.
--
-- Escopo: company_id = 451a7940-a56b-425f-ae5f-e493d536591f APENAS.
-- Inclui soft-deleted. NÃO apaga companies, auth, profiles, members, roles,
-- HQ, cost_centers/positions/financial_* com is_system, portal compartilhado.
--
-- Atomicidade: uma função PostgreSQL = uma transação.
--
-- Autorização (GUC e p_confirm NÃO autenticam):
-- - auth.uid() obrigatório
-- - membership Super Admin (r.company_id = cm.company_id); Portal Master recusado
-- - GUC app.allow_hml_company_reset + p_confirm = gates operacionais
-- - EXECUTE revogado de PUBLIC, anon, authenticated e service_role
--
-- Concorrência: advisory xact lock compartilhado com 102
--   pg_advisory_xact_lock(hashtextextended(c_expected_company::text, 0))
-- → FOR UPDATE empresa+HQ → IDs-alvo → FOR UPDATE pais (incl. trips/routes/
-- fuel/maintenance/tires) → cross-tenant → deletes.
-- O lock compartilhado impede 102∥103 na mesma empresa; NÃO substitui revisão
-- das demais operações concorrentes da aplicação.
-- companies FOR UPDATE bloqueia INSERT same-tenant (FK company_id). Pais FOR UPDATE
-- bloqueiam FOR KEY SHARE de inserts/updates FK concorrentes. READ COMMITTED:
-- pós-checks residuais abortam a tx se algo escapar. NÃO substitui isolamento
-- SERIALIZABLE; deadlocks sob carga app são risco residual (retry).
-- Cross-tenant: antes de apagar pais com FK SET NULL/RESTRICT por id, aborta se
-- outra empresa referencia esses IDs.
--
-- Project-ref: PostgreSQL NÃO conhece o ref Supabase. Gate app.hml_expected_project_ref
-- exige que o CLI (após validar o host da URL) sete a GUC — defesa em profundidade,
-- não prova criptográfica de projeto. Apply/execução no projeto errado continua
-- sendo falha de processo se o operador setar a GUC manualmente no projeto errado.
--
-- payroll_expenses: set_config('app.allow_payroll_hard_delete','on',true) na tx.
--
-- ACL: REVOKE imediato após CREATE (mitiga pg_default_acl de supabase_admin).
-- ACLs remotas efetivas exigem verificação readonly pós-apply.
--
-- Desativação pós-uso (manual):
--   revoke all on function public.hml_reset_company_business_data(uuid, text) from public;
--   drop function if exists public.hml_reset_company_business_data(uuid, text);
--   -- manter hml_company_reset_audit_events; não truncar.
-- ---------------------------------------------------------------------------

create table if not exists public.hml_company_reset_audit_events (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  actor_profile_id uuid references public.profiles (id) on delete restrict,
  scope           text not null,
  result          text not null,
  counts          jsonb not null default '{}'::jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  constraint hml_company_reset_audit_events_scope_not_empty
    check (length(trim(scope)) > 0),
  constraint hml_company_reset_audit_events_result_not_empty
    check (length(trim(result)) > 0),
  constraint hml_company_reset_audit_events_counts_is_object
    check (jsonb_typeof(counts) = 'object'),
  constraint hml_company_reset_audit_events_metadata_is_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.hml_company_reset_audit_events is
  'Trilha append-only do reset de negócio HML. Escrita só pela função SECURITY DEFINER. Verificar ACLs remotas pós-apply.';

create index if not exists idx_hml_company_reset_audit_company_created
  on public.hml_company_reset_audit_events (company_id, created_at desc);

alter table public.hml_company_reset_audit_events enable row level security;

drop policy if exists hml_company_reset_audit_select_super_admin
  on public.hml_company_reset_audit_events;

create policy hml_company_reset_audit_select_super_admin
  on public.hml_company_reset_audit_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      inner join public.roles r on r.id = cm.role_id
      where cm.company_id = hml_company_reset_audit_events.company_id
        and cm.profile_id = auth.uid()
        and cm.deleted_at is null
        and cm.status = 'active'
        and r.company_id = cm.company_id
        and r.deleted_at is null
        and r.status = 'active'
        and r.is_system = true
        and r.name = 'Super Admin'
    )
  );

create or replace function public.hml_company_reset_audit_events_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'hml_company_reset_audit_events is append-only'
    using errcode = '42501';
end;
$$;

drop trigger if exists hml_company_reset_audit_events_no_update
  on public.hml_company_reset_audit_events;
create trigger hml_company_reset_audit_events_no_update
  before update on public.hml_company_reset_audit_events
  for each row execute function public.hml_company_reset_audit_events_immutable();

drop trigger if exists hml_company_reset_audit_events_no_delete
  on public.hml_company_reset_audit_events;
create trigger hml_company_reset_audit_events_no_delete
  before delete on public.hml_company_reset_audit_events
  for each row execute function public.hml_company_reset_audit_events_immutable();

drop trigger if exists hml_company_reset_audit_events_no_truncate
  on public.hml_company_reset_audit_events;
create trigger hml_company_reset_audit_events_no_truncate
  before truncate on public.hml_company_reset_audit_events
  for each statement execute function public.hml_company_reset_audit_events_immutable();

revoke all on function public.hml_company_reset_audit_events_immutable() from public;
revoke all on function public.hml_company_reset_audit_events_immutable() from anon;
revoke all on function public.hml_company_reset_audit_events_immutable() from authenticated;
revoke all on function public.hml_company_reset_audit_events_immutable() from service_role;

revoke all on table public.hml_company_reset_audit_events from public;
revoke all on table public.hml_company_reset_audit_events from anon;
revoke all on table public.hml_company_reset_audit_events from authenticated;
revoke all on table public.hml_company_reset_audit_events from service_role;
grant select on table public.hml_company_reset_audit_events to authenticated;

create or replace function public.hml_reset_company_business_data(
  p_company_id uuid,
  p_confirm text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_expected_company uuid := '451a7940-a56b-425f-ae5f-e493d536591f';
  c_expected_project_ref text := 'aobfjjaucdrwybebosxm';
  c_confirm text := 'HML_RESET_COMPANY_BUSINESS';
  c_guc text := 'app.allow_hml_company_reset';
  c_project_guc text := 'app.hml_expected_project_ref';
  c_scope text := 'hml_company_business_reset';

  v_actor uuid := auth.uid();
  v_guc text;
  v_project_guc text;
  v_is_membership_super_admin boolean;
  v_is_portal_master_acting boolean;
  v_hq_id uuid;
  v_hq_code text;
  v_company_slug text;
  v_count int;
  v_xt int;
  v_deleted jsonb := '{}'::jsonb;
  v_payload jsonb;

  v_branch_ids uuid[];
  v_cc_ids uuid[];
  v_pos_ids uuid[];
  v_supplier_ids uuid[];
  v_customer_ids uuid[];
  v_contract_ids uuid[];
  v_vehicle_ids uuid[];
  v_driver_ids uuid[];
  v_trip_ids uuid[];
  v_route_ids uuid[];
  v_fuel_ids uuid[];
  v_maint_ids uuid[];
  v_tire_ids uuid[];
begin
  -- ---- gates ----
  if p_company_id is distinct from c_expected_company then
    raise exception 'hml_company_reset: company_id não autorizado'
      using errcode = '42501';
  end if;

  if p_confirm is distinct from c_confirm then
    raise exception 'hml_company_reset: confirmação inválida'
      using errcode = '42501';
  end if;

  v_guc := coalesce(current_setting(c_guc, true), '');
  if v_guc is distinct from c_confirm then
    raise exception 'hml_company_reset: GUC app.allow_hml_company_reset ausente ou inválida'
      using errcode = '42501';
  end if;

  -- Defesa em profundidade: CLI deve setar após validar host da URL.
  -- Não prova que a sessão está no projeto Supabase correto.
  v_project_guc := coalesce(current_setting(c_project_guc, true), '');
  if v_project_guc is distinct from c_expected_project_ref then
    raise exception
      'hml_company_reset: GUC app.hml_expected_project_ref ausente ou divergente do ref embutido'
      using errcode = '42501';
  end if;

  if v_actor is null then
    raise exception 'hml_company_reset: auth.uid() nulo'
      using errcode = '42501';
  end if;

  v_is_portal_master_acting := public.is_portal_owner_acting_for(c_expected_company);
  if v_is_portal_master_acting is true then
    raise exception
      'hml_company_reset: Portal Master acting não autorizado'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.company_members cm
    inner join public.roles r on r.id = cm.role_id
    where cm.company_id = c_expected_company
      and cm.profile_id = v_actor
      and cm.deleted_at is null
      and cm.status = 'active'
      and r.company_id = cm.company_id
      and r.deleted_at is null
      and r.status = 'active'
      and r.is_system = true
      and r.name = 'Super Admin'
  ) into v_is_membership_super_admin;

  if v_is_membership_super_admin is not true then
    raise exception 'hml_company_reset: requer membership Super Admin da empresa-alvo'
      using errcode = '42501';
  end if;

  -- ---- lock → revalidação (reduz TOCTOU) ----
  -- Mesma chave que hml_hard_delete_manifest_43 (102): serializa 102∥103
  -- na empresa HML. Não cobre writers da aplicação fora destas RPCs.
  perform pg_advisory_xact_lock(hashtextextended(c_expected_company::text, 0));

  perform 1 from public.companies
    where id = c_expected_company
    for update;

  select slug into v_company_slug
  from public.companies
  where id = c_expected_company and deleted_at is null;

  if v_company_slug is distinct from 'primeira-empresa' then
    raise exception 'hml_company_reset: slug da empresa divergente ou empresa ausente';
  end if;

  select id, code into v_hq_id, v_hq_code
  from public.branches
  where company_id = c_expected_company
    and is_headquarters = true
    and deleted_at is null
  for update;

  if v_hq_id is null or v_hq_code is distinct from 'HQ' then
    raise exception 'hml_company_reset: HQ ausente ou code != HQ';
  end if;

  select count(*) into v_count
  from public.cost_centers
  where company_id = c_expected_company
    and is_system = true
    and deleted_at is null;
  if v_count < 1 then
    raise exception 'hml_company_reset: nenhum cost_center de sistema ativo';
  end if;

  select count(*) into v_count
  from public.positions
  where company_id = c_expected_company
    and is_system = true
    and deleted_at is null;
  if v_count < 1 then
    raise exception 'hml_company_reset: nenhum position de sistema ativo';
  end if;

  select count(*) into v_count
  from public.financial_categories
  where company_id = c_expected_company
    and is_system = true
    and deleted_at is null;
  if v_count < 1 then
    raise exception 'hml_company_reset: nenhuma financial_category de sistema ativa';
  end if;

  select count(*) into v_count
  from public.company_members
  where company_id = c_expected_company
    and deleted_at is null
    and status = 'active';
  if v_count < 1 then
    raise exception 'hml_company_reset: nenhum company_member ativo';
  end if;

  -- IDs que serão removidos (incl. soft-deleted) — para locks + cross-tenant
  select coalesce(array_agg(id), array[]::uuid[]) into v_branch_ids
  from public.branches
  where company_id = c_expected_company and is_headquarters = false;

  select coalesce(array_agg(id), array[]::uuid[]) into v_cc_ids
  from public.cost_centers
  where company_id = c_expected_company and is_system = false;

  select coalesce(array_agg(id), array[]::uuid[]) into v_pos_ids
  from public.positions
  where company_id = c_expected_company and is_system = false;

  select coalesce(array_agg(id), array[]::uuid[]) into v_supplier_ids
  from public.suppliers where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_customer_ids
  from public.customers where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_contract_ids
  from public.customer_contracts where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_vehicle_ids
  from public.vehicles where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_driver_ids
  from public.drivers where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_trip_ids
  from public.trips where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_route_ids
  from public.routes where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_fuel_ids
  from public.fuel_records where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_maint_ids
  from public.maintenance_records where company_id = c_expected_company;

  select coalesce(array_agg(id), array[]::uuid[]) into v_tire_ids
  from public.tires where company_id = c_expected_company;

  -- FOR UPDATE nos pais a remover (bloqueia FOR KEY SHARE de inserts FK concorrentes)
  if cardinality(v_branch_ids) > 0 then
    perform 1 from public.branches where id = any (v_branch_ids) for update;
  end if;
  if cardinality(v_cc_ids) > 0 then
    perform 1 from public.cost_centers where id = any (v_cc_ids) for update;
  end if;
  if cardinality(v_pos_ids) > 0 then
    perform 1 from public.positions where id = any (v_pos_ids) for update;
  end if;
  if cardinality(v_supplier_ids) > 0 then
    perform 1 from public.suppliers where id = any (v_supplier_ids) for update;
  end if;
  if cardinality(v_customer_ids) > 0 then
    perform 1 from public.customers where id = any (v_customer_ids) for update;
  end if;
  if cardinality(v_contract_ids) > 0 then
    perform 1 from public.customer_contracts where id = any (v_contract_ids) for update;
  end if;
  if cardinality(v_vehicle_ids) > 0 then
    perform 1 from public.vehicles where id = any (v_vehicle_ids) for update;
  end if;
  if cardinality(v_driver_ids) > 0 then
    perform 1 from public.drivers where id = any (v_driver_ids) for update;
  end if;
  if cardinality(v_trip_ids) > 0 then
    perform 1 from public.trips where id = any (v_trip_ids) for update;
  end if;
  if cardinality(v_route_ids) > 0 then
    perform 1 from public.routes where id = any (v_route_ids) for update;
  end if;
  if cardinality(v_fuel_ids) > 0 then
    perform 1 from public.fuel_records where id = any (v_fuel_ids) for update;
  end if;
  if cardinality(v_maint_ids) > 0 then
    perform 1 from public.maintenance_records where id = any (v_maint_ids) for update;
  end if;
  if cardinality(v_tire_ids) > 0 then
    perform 1 from public.tires where id = any (v_tire_ids) for update;
  end if;

  -- Cross-tenant: ref de OUTRA empresa → abort (evita SET NULL/RESTRICT remoto)
  if cardinality(v_branch_ids) > 0 then
    select count(*) into v_xt from public.company_members
    where default_branch_id = any (v_branch_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then
      raise exception 'hml_company_reset: cross-tenant company_members.default_branch_id';
    end if;
    select count(*) into v_xt from public.vehicles
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant vehicles.branch_id'; end if;
    select count(*) into v_xt from public.customers
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant customers.branch_id'; end if;
    select count(*) into v_xt from public.customer_addresses
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant customer_addresses.branch_id'; end if;
    select count(*) into v_xt from public.customer_contacts
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant customer_contacts.branch_id'; end if;
    select count(*) into v_xt from public.customer_contracts
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant customer_contracts.branch_id'; end if;
    select count(*) into v_xt from public.customer_contract_items
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant customer_contract_items.branch_id'; end if;
    select count(*) into v_xt from public.customer_documents
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant customer_documents.branch_id'; end if;
    select count(*) into v_xt from public.customer_history
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant customer_history.branch_id'; end if;
    select count(*) into v_xt from public.drivers
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant drivers.branch_id'; end if;
    select count(*) into v_xt from public.employees
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant employees.branch_id'; end if;
    select count(*) into v_xt from public.payroll_expenses
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant payroll_expenses.branch_id'; end if;
    select count(*) into v_xt from public.routes
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant routes.branch_id'; end if;
    select count(*) into v_xt from public.financial_entries
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.branch_id'; end if;
    select count(*) into v_xt from public.financial_categories
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_categories.branch_id'; end if;
    select count(*) into v_xt from public.financial_cost_centers
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_cost_centers.branch_id'; end if;
    select count(*) into v_xt from public.financial_documents
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_documents.branch_id'; end if;
    select count(*) into v_xt from public.financial_history
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_history.branch_id'; end if;
    select count(*) into v_xt from public.fuel_records
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_records.branch_id'; end if;
    select count(*) into v_xt from public.fuel_history
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_history.branch_id'; end if;
    select count(*) into v_xt from public.fuel_documents
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_documents.branch_id'; end if;
    select count(*) into v_xt from public.maintenance_records
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_records.branch_id'; end if;
    select count(*) into v_xt from public.maintenance_schedules
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_schedules.branch_id'; end if;
    select count(*) into v_xt from public.maintenance_history
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_history.branch_id'; end if;
    select count(*) into v_xt from public.maintenance_documents
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_documents.branch_id'; end if;
    select count(*) into v_xt from public.maintenance_parts
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_parts.branch_id'; end if;
    select count(*) into v_xt from public.maintenance_services
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_services.branch_id'; end if;
    select count(*) into v_xt from public.tires
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tires.branch_id'; end if;
    select count(*) into v_xt from public.tire_history
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_history.branch_id'; end if;
    select count(*) into v_xt from public.tire_movements
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_movements.branch_id'; end if;
    select count(*) into v_xt from public.tire_inspections
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_inspections.branch_id'; end if;
    select count(*) into v_xt from public.tire_recaps
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_recaps.branch_id'; end if;
    select count(*) into v_xt from public.tire_documents
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_documents.branch_id'; end if;
    select count(*) into v_xt from public.trips
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trips.branch_id'; end if;
    select count(*) into v_xt from public.trip_history
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trip_history.branch_id'; end if;
    select count(*) into v_xt from public.trip_expenses
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trip_expenses.branch_id'; end if;
    select count(*) into v_xt from public.trip_stops
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trip_stops.branch_id'; end if;
    select count(*) into v_xt from public.trip_occurrences
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trip_occurrences.branch_id'; end if;
    select count(*) into v_xt from public.trip_checklists
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trip_checklists.branch_id'; end if;
    select count(*) into v_xt from public.trip_documents
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trip_documents.branch_id'; end if;
    select count(*) into v_xt from public.trip_locations
    where branch_id = any (v_branch_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trip_locations.branch_id'; end if;
  end if;

  if cardinality(v_cc_ids) > 0 then
    select count(*) into v_xt from public.employees
    where cost_center_id = any (v_cc_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant employees.cost_center_id'; end if;
    select count(*) into v_xt from public.payroll_expenses
    where cost_center_id = any (v_cc_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant payroll_expenses.cost_center_id'; end if;
    select count(*) into v_xt from public.financial_entries
    where cost_center_id = any (v_cc_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.cost_center_id'; end if;
  end if;

  if cardinality(v_pos_ids) > 0 then
    select count(*) into v_xt from public.employees
    where position_id = any (v_pos_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant employees.position_id'; end if;
    select count(*) into v_xt from public.payroll_expenses
    where position_id = any (v_pos_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant payroll_expenses.position_id'; end if;
  end if;

  if cardinality(v_supplier_ids) > 0 then
    select count(*) into v_xt from public.financial_entries
    where supplier_id = any (v_supplier_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.supplier_id'; end if;
    select count(*) into v_xt from public.fuel_records
    where supplier_id = any (v_supplier_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_records.supplier_id'; end if;
    select count(*) into v_xt from public.maintenance_records
    where supplier_id = any (v_supplier_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_records.supplier_id'; end if;
    select count(*) into v_xt from public.tires
    where supplier_id = any (v_supplier_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tires.supplier_id'; end if;
    select count(*) into v_xt from public.tire_recaps
    where supplier_id = any (v_supplier_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_recaps.supplier_id'; end if;
  end if;

  if cardinality(v_customer_ids) > 0 then
    select count(*) into v_xt from public.financial_entries
    where customer_id = any (v_customer_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.customer_id'; end if;
    select count(*) into v_xt from public.routes
    where customer_id = any (v_customer_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant routes.customer_id'; end if;
    select count(*) into v_xt from public.trips
    where customer_id = any (v_customer_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trips.customer_id'; end if;
  end if;

  if cardinality(v_contract_ids) > 0 then
    select count(*) into v_xt from public.financial_entries
    where customer_contract_id = any (v_contract_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.customer_contract_id'; end if;
    select count(*) into v_xt from public.trips
    where customer_contract_id = any (v_contract_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trips.customer_contract_id'; end if;
  end if;

  if cardinality(v_vehicle_ids) > 0 then
    select count(*) into v_xt from public.trips
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trips.vehicle_id'; end if;
    select count(*) into v_xt from public.fuel_records
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_records.vehicle_id'; end if;
    select count(*) into v_xt from public.fuel_history
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_history.vehicle_id'; end if;
    select count(*) into v_xt from public.fuel_documents
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_documents.vehicle_id'; end if;
    select count(*) into v_xt from public.maintenance_records
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_records.vehicle_id'; end if;
    select count(*) into v_xt from public.maintenance_schedules
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_schedules.vehicle_id'; end if;
    select count(*) into v_xt from public.maintenance_history
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_history.vehicle_id'; end if;
    select count(*) into v_xt from public.maintenance_documents
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_documents.vehicle_id'; end if;
    select count(*) into v_xt from public.maintenance_parts
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_parts.vehicle_id'; end if;
    select count(*) into v_xt from public.maintenance_services
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_services.vehicle_id'; end if;
    select count(*) into v_xt from public.tires
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tires.vehicle_id'; end if;
    select count(*) into v_xt from public.tire_history
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_history.vehicle_id'; end if;
    select count(*) into v_xt from public.tire_movements
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_movements.vehicle_id'; end if;
    select count(*) into v_xt from public.tire_inspections
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_inspections.vehicle_id'; end if;
    select count(*) into v_xt from public.tire_recaps
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_recaps.vehicle_id'; end if;
    select count(*) into v_xt from public.tire_documents
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant tire_documents.vehicle_id'; end if;
    select count(*) into v_xt from public.financial_entries
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.vehicle_id'; end if;
    select count(*) into v_xt from public.financial_categories
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_categories.vehicle_id'; end if;
    select count(*) into v_xt from public.financial_cost_centers
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_cost_centers.vehicle_id'; end if;
    select count(*) into v_xt from public.financial_documents
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_documents.vehicle_id'; end if;
    select count(*) into v_xt from public.financial_history
    where vehicle_id = any (v_vehicle_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_history.vehicle_id'; end if;
  end if;

  if cardinality(v_driver_ids) > 0 then
    select count(*) into v_xt from public.fuel_records
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_records.driver_id'; end if;
    select count(*) into v_xt from public.fuel_history
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_history.driver_id'; end if;
    select count(*) into v_xt from public.fuel_documents
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_documents.driver_id'; end if;
    select count(*) into v_xt from public.trips
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trips.driver_id'; end if;
    select count(*) into v_xt from public.payroll_expenses
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant payroll_expenses.driver_id'; end if;
    select count(*) into v_xt from public.financial_entries
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.driver_id'; end if;
    select count(*) into v_xt from public.financial_categories
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_categories.driver_id'; end if;
    select count(*) into v_xt from public.financial_cost_centers
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_cost_centers.driver_id'; end if;
    select count(*) into v_xt from public.financial_documents
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_documents.driver_id'; end if;
    select count(*) into v_xt from public.financial_history
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_history.driver_id'; end if;
    select count(*) into v_xt from public.maintenance_records
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_records.driver_id'; end if;
    select count(*) into v_xt from public.maintenance_schedules
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_schedules.driver_id'; end if;
    select count(*) into v_xt from public.maintenance_history
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_history.driver_id'; end if;
    select count(*) into v_xt from public.maintenance_documents
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_documents.driver_id'; end if;
    select count(*) into v_xt from public.maintenance_parts
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_parts.driver_id'; end if;
    select count(*) into v_xt from public.maintenance_services
    where driver_id = any (v_driver_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_services.driver_id'; end if;
  end if;

  if cardinality(v_trip_ids) > 0 then
    select count(*) into v_xt from public.fuel_records
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_records.trip_id'; end if;
    select count(*) into v_xt from public.fuel_history
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_history.trip_id'; end if;
    select count(*) into v_xt from public.fuel_documents
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant fuel_documents.trip_id'; end if;
    select count(*) into v_xt from public.maintenance_records
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_records.trip_id'; end if;
    select count(*) into v_xt from public.maintenance_schedules
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_schedules.trip_id'; end if;
    select count(*) into v_xt from public.maintenance_history
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_history.trip_id'; end if;
    select count(*) into v_xt from public.maintenance_documents
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_documents.trip_id'; end if;
    select count(*) into v_xt from public.maintenance_parts
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_parts.trip_id'; end if;
    select count(*) into v_xt from public.maintenance_services
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant maintenance_services.trip_id'; end if;
    select count(*) into v_xt from public.financial_entries
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.trip_id'; end if;
    select count(*) into v_xt from public.financial_categories
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_categories.trip_id'; end if;
    select count(*) into v_xt from public.financial_cost_centers
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_cost_centers.trip_id'; end if;
    select count(*) into v_xt from public.financial_documents
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_documents.trip_id'; end if;
    select count(*) into v_xt from public.financial_history
    where trip_id = any (v_trip_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_history.trip_id'; end if;
  end if;

  if cardinality(v_route_ids) > 0 then
    select count(*) into v_xt from public.trips
    where route_id = any (v_route_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant trips.route_id'; end if;
  end if;

  if cardinality(v_fuel_ids) > 0 then
    select count(*) into v_xt from public.financial_entries
    where fuel_record_id = any (v_fuel_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.fuel_record_id'; end if;
    select count(*) into v_xt from public.financial_categories
    where fuel_record_id = any (v_fuel_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_categories.fuel_record_id'; end if;
    select count(*) into v_xt from public.financial_cost_centers
    where fuel_record_id = any (v_fuel_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_cost_centers.fuel_record_id'; end if;
    select count(*) into v_xt from public.financial_documents
    where fuel_record_id = any (v_fuel_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_documents.fuel_record_id'; end if;
    select count(*) into v_xt from public.financial_history
    where fuel_record_id = any (v_fuel_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_history.fuel_record_id'; end if;
  end if;

  if cardinality(v_maint_ids) > 0 then
    select count(*) into v_xt from public.financial_entries
    where maintenance_record_id = any (v_maint_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.maintenance_record_id'; end if;
    select count(*) into v_xt from public.financial_categories
    where maintenance_record_id = any (v_maint_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_categories.maintenance_record_id'; end if;
    select count(*) into v_xt from public.financial_cost_centers
    where maintenance_record_id = any (v_maint_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_cost_centers.maintenance_record_id'; end if;
    select count(*) into v_xt from public.financial_documents
    where maintenance_record_id = any (v_maint_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_documents.maintenance_record_id'; end if;
    select count(*) into v_xt from public.financial_history
    where maintenance_record_id = any (v_maint_ids)
      and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_history.maintenance_record_id'; end if;
  end if;

  if cardinality(v_tire_ids) > 0 then
    select count(*) into v_xt from public.financial_entries
    where tire_id = any (v_tire_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_entries.tire_id'; end if;
    select count(*) into v_xt from public.financial_categories
    where tire_id = any (v_tire_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_categories.tire_id'; end if;
    select count(*) into v_xt from public.financial_cost_centers
    where tire_id = any (v_tire_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_cost_centers.tire_id'; end if;
    select count(*) into v_xt from public.financial_documents
    where tire_id = any (v_tire_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_documents.tire_id'; end if;
    select count(*) into v_xt from public.financial_history
    where tire_id = any (v_tire_ids) and company_id is distinct from c_expected_company;
    if v_xt > 0 then raise exception 'hml_company_reset: cross-tenant financial_history.tire_id'; end if;
  end if;

  -- Liberar hard-delete de payroll na mesma tx (migration 091). NÃO é autenticação.
  perform set_config('app.allow_payroll_hard_delete', 'on', true);

  -- Mutação mínima e intencional em company_members (tabela preservada):
  -- só default_branch_id apontando para filial não-HQ → HQ, para não bloquear DELETE.
  update public.company_members
  set default_branch_id = v_hq_id,
      updated_at = now()
  where company_id = c_expected_company
    and default_branch_id is not null
    and default_branch_id = any (v_branch_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('members_default_branch_reassigned', v_count);

  -- ---- DELETE full (company_id) na ordem de dependência ----
  delete from public.financial_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('financial_history', v_count);

  delete from public.financial_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('financial_documents', v_count);

  delete from public.financial_entries where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('financial_entries', v_count);

  delete from public.payroll_expenses where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('payroll_expenses', v_count);

  delete from public.employees where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('employees', v_count);

  delete from public.fuel_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('fuel_history', v_count);

  delete from public.fuel_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('fuel_documents', v_count);

  delete from public.fuel_records where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('fuel_records', v_count);

  delete from public.maintenance_parts where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('maintenance_parts', v_count);

  delete from public.maintenance_services where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('maintenance_services', v_count);

  delete from public.maintenance_schedules where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('maintenance_schedules', v_count);

  delete from public.maintenance_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('maintenance_documents', v_count);

  delete from public.maintenance_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('maintenance_history', v_count);

  delete from public.maintenance_records where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('maintenance_records', v_count);

  delete from public.tire_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('tire_documents', v_count);

  delete from public.tire_recaps where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('tire_recaps', v_count);

  delete from public.tire_inspections where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('tire_inspections', v_count);

  delete from public.tire_movements where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('tire_movements', v_count);

  delete from public.tire_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('tire_history', v_count);

  delete from public.tires where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('tires', v_count);

  delete from public.trip_locations where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trip_locations', v_count);

  delete from public.trip_stops where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trip_stops', v_count);

  delete from public.trip_expenses where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trip_expenses', v_count);

  delete from public.trip_checklists where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trip_checklists', v_count);

  delete from public.trip_occurrences where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trip_occurrences', v_count);

  delete from public.trip_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trip_documents', v_count);

  delete from public.trip_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trip_history', v_count);

  delete from public.trips where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('trips', v_count);

  delete from public.route_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('route_documents', v_count);

  delete from public.route_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('route_history', v_count);

  delete from public.routes where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('routes', v_count);

  delete from public.customer_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_history', v_count);

  delete from public.customer_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_documents', v_count);

  delete from public.customer_contract_items where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_contract_items', v_count);

  delete from public.customer_contracts where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_contracts', v_count);

  delete from public.customer_contacts where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_contacts', v_count);

  delete from public.customer_addresses where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_addresses', v_count);

  delete from public.customers where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customers', v_count);

  delete from public.suppliers where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('suppliers', v_count);

  delete from public.driver_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('driver_documents', v_count);

  delete from public.driver_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('driver_history', v_count);

  delete from public.drivers where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('drivers', v_count);

  delete from public.vehicle_documents where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('vehicle_documents', v_count);

  delete from public.vehicle_history where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('vehicle_history', v_count);

  delete from public.vehicles where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('vehicles', v_count);

  delete from public.vision_providers where company_id = c_expected_company;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('vision_providers', v_count);

  -- ---- DELETE seletivo (preserva sistema / HQ) ----
  delete from public.positions
  where company_id = c_expected_company and is_system = false;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('positions_custom', v_count);

  delete from public.cost_centers
  where company_id = c_expected_company and is_system = false;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('cost_centers_custom', v_count);

  delete from public.financial_cost_centers
  where company_id = c_expected_company and is_system = false;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('financial_cost_centers_custom', v_count);

  delete from public.financial_categories
  where company_id = c_expected_company and is_system = false;
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('financial_categories_custom', v_count);

  delete from public.branches
  where company_id = c_expected_company
    and is_headquarters = false
    and id = any (v_branch_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('branches_non_hq', v_count);

  -- ---- pós-condições (empty-guards do seed) ----
  select count(*) into v_count from public.branches
  where company_id = c_expected_company
    and is_headquarters = true
    and deleted_at is null
    and code = 'HQ'
    and id = v_hq_id;
  if v_count <> 1 then
    raise exception 'hml_company_reset: HQ não preservada';
  end if;

  select count(*) into v_count from public.branches
  where company_id = c_expected_company and is_headquarters = false;
  if v_count > 0 then
    raise exception 'hml_company_reset: filiais não-HQ residuais';
  end if;

  select count(*) into v_count from public.cost_centers
  where company_id = c_expected_company and is_system = false;
  if v_count > 0 then
    raise exception 'hml_company_reset: cost_centers custom residuais';
  end if;

  select count(*) into v_count from public.positions
  where company_id = c_expected_company and is_system = false;
  if v_count > 0 then
    raise exception 'hml_company_reset: positions custom residuais';
  end if;

  select count(*) into v_count from public.vehicles where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: vehicles residuais'; end if;
  select count(*) into v_count from public.drivers where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: drivers residuais'; end if;
  select count(*) into v_count from public.customers where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: customers residuais'; end if;
  select count(*) into v_count from public.suppliers where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: suppliers residuais'; end if;
  select count(*) into v_count from public.routes where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: routes residuais'; end if;
  select count(*) into v_count from public.trips where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: trips residuais'; end if;
  select count(*) into v_count from public.fuel_records where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: fuel_records residuais'; end if;
  select count(*) into v_count from public.maintenance_records where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: maintenance_records residuais'; end if;
  select count(*) into v_count from public.tires where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: tires residuais'; end if;
  select count(*) into v_count from public.employees where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: employees residuais'; end if;
  select count(*) into v_count from public.payroll_expenses where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: payroll_expenses residuais'; end if;
  select count(*) into v_count from public.financial_entries where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: financial_entries residuais'; end if;
  select count(*) into v_count from public.customer_contracts where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: customer_contracts residuais'; end if;
  select count(*) into v_count from public.vision_providers where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: vision_providers residuais'; end if;
  select count(*) into v_count from public.customer_history where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: customer_history residual'; end if;
  select count(*) into v_count from public.vehicle_history where company_id = c_expected_company;
  if v_count > 0 then raise exception 'hml_company_reset: vehicle_history residual'; end if;
  select count(*) into v_count from public.roles
  where company_id = c_expected_company and deleted_at is null;
  if v_count < 1 then raise exception 'hml_company_reset: roles de sistema ausentes'; end if;

  select count(*) into v_count from public.companies where id = c_expected_company;
  if v_count <> 1 then
    raise exception 'hml_company_reset: empresa-alvo ausente após reset';
  end if;

  select count(*) into v_count from public.company_members
  where company_id = c_expected_company and deleted_at is null and status = 'active';
  if v_count < 1 then
    raise exception 'hml_company_reset: members ativos perdidos';
  end if;

  insert into public.hml_company_reset_audit_events (
    company_id, actor_profile_id, scope, result, counts, metadata
  ) values (
    c_expected_company,
    v_actor,
    c_scope,
    'reset_ok',
    v_deleted,
    jsonb_build_object(
      'companyIdPrefix', left(c_expected_company::text, 8),
      'actorPrefix', left(v_actor::text, 8),
      'hqPreserved', true,
      'slug', v_company_slug
    )
  );

  v_payload := jsonb_build_object(
    'status', 'reset_ok',
    'companyIdPrefix', left(c_expected_company::text, 8),
    'deleted', v_deleted,
    'actorPrefix', left(v_actor::text, 8),
    'hqPreserved', true,
    'audited', true
  );
  return v_payload;
end;
$$;

comment on function public.hml_reset_company_business_data(uuid, text) is
  'Reset transacional dos dados de negócio fictícios da empresa HML (preserva empresa/HQ/sistema/auth/roles/members). NÃO invocar sem autorização humana. Desativar com DROP FUNCTION após o uso.';

-- Mitiga pg_default_acl (supabase_admin concede EXECUTE a anon/authenticated/service_role).
revoke all on function public.hml_reset_company_business_data(uuid, text) from public;
revoke all on function public.hml_reset_company_business_data(uuid, text) from anon;
revoke all on function public.hml_reset_company_business_data(uuid, text) from authenticated;
revoke all on function public.hml_reset_company_business_data(uuid, text) from service_role;
-- Sem GRANT EXECUTE. Reabilitação exige autorização humana + GRANT explícito.
