-- FleetControl — hard-delete transacional do manifesto parcial HML (43 IDs)
-- ---------------------------------------------------------------------------
-- PREPARADA LOCALMENTE. NÃO aplicar nem invocar sem autorização humana explícita.
--
-- NOTA (reset de homologação): para limpar a base fictícia e re-seedar, preferir
-- a migration 103 (hml_reset_company_business_data) — company-scoped com
-- preservação explícita. Esta 102 permanece como ferramenta ESTREITA do
-- manifesto parcial 2026-10-20; não cobre drivers/rotas/viagens/folha/financeiro.
--
-- Escopo: exatamente os 43 UUIDs do manifesto
--   .hml-seed/evidence-2026-10-20-partial/manifest.json
-- mais customer_history / vehicle_history comprovadamente vinculados a esses pais.
--
-- Atomicidade: uma única função PostgreSQL = uma transação.
-- Não usa várias chamadas PostgREST. Não desliga constraints/triggers.
--
-- Autorização (explícita — GUC e p_confirm NÃO são autenticação):
-- - auth.uid() obrigatório
-- - membership Super Admin da empresa-alvo (company_members + role sistema
--   'Super Admin' com r.company_id = cm.company_id). Portal Master /
--   is_portal_owner_acting_for é RECUSADO; caminho Master exigiria migration à parte.
-- - GUC app.allow_hml_hard_delete e p_confirm são APENAS gates operacionais.
--   Não autenticam o chamador. Via app/PostgREST: sessão JWT (auth.uid) +
--   membership. Via SQL direto: o mesmo auth.uid()/JWT de sessão aplica-se;
--   quem controla a sessão SQL pode forjar claims — por isso EXECUTE fica
--   revogado até autorização humana e a limpeza não deve rodar em SQL ad hoc.
-- - EXECUTE revogado de PUBLIC, anon, authenticated e service_role.
--
-- CASCADE: inventário antes do 1º DELETE; filho fora da allowlist → abort.
--
-- SET NULL / RESTRICT: contagens GLOBAIS (sem filtrar só a empresa HML) quando
-- a FK é por id simples — evita mutar outra empresa. Inclui soft-deleted.
-- Inclui customer_*.branch_id (067). Exclui da contagem só IDs que serão
-- apagados na mesma transação (exclude allowlist).
--
-- Concorrência: advisory xact lock compartilhado com 103
--   pg_advisory_xact_lock(hashtextextended(c_expected_company::text, 0))
-- depois SELECT … FOR UPDATE dos 43 alvos presentes. O lock compartilhado
-- impede 102∥103 na mesma empresa; NÃO substitui revisão das demais operações
-- concorrentes da aplicação. Limite residual: writers que não tocam nas linhas
-- bloqueadas / tabelas sem FK KEY SHARE ainda podem correr em paralelo.
--
-- Project-ref: PostgreSQL NÃO conhece o ref Supabase. Gate
-- app.hml_expected_project_ref exige que o CLI (após validar o host da URL)
-- sete a GUC — defesa em profundidade, NÃO prova criptográfica de projeto.
-- Apply/execução no projeto errado continua sendo falha de processo se o
-- operador setar a GUC manualmente no projeto errado.
--
-- Auditoria: hml_hard_delete_audit_events (NÃO portal_audit_logs). INSERT na
-- mesma tx; falha aborta. Append-only (trigger). ACLs locais explícitas;
-- ACLs remotas efetivas NÃO foram verificadas nesta preparação.
--
-- Desativação pós-uso (manual, sem 2ª operação destrutiva automática):
--   revoke all on function public.hml_hard_delete_manifest_43(uuid, text) from public;
--   drop function if exists public.hml_hard_delete_manifest_43(uuid, text);
--   -- manter hml_hard_delete_audit_events; não truncar.
-- ---------------------------------------------------------------------------

create table if not exists public.hml_hard_delete_audit_events (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  -- RESTRICT: apagar profile não deve reescrever a trilha (SET NULL adulteraria).
  actor_profile_id uuid references public.profiles (id) on delete restrict,
  scope           text not null,
  result          text not null,
  counts          jsonb not null default '{}'::jsonb,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  constraint hml_hard_delete_audit_events_scope_not_empty
    check (length(trim(scope)) > 0),
  constraint hml_hard_delete_audit_events_result_not_empty
    check (length(trim(result)) > 0),
  constraint hml_hard_delete_audit_events_counts_is_object
    check (jsonb_typeof(counts) = 'object'),
  constraint hml_hard_delete_audit_events_metadata_is_object
    check (jsonb_typeof(metadata) = 'object')
);

comment on table public.hml_hard_delete_audit_events is
  'Trilha append-only da limpeza física HML manifesto 43. Escrita só pela função SECURITY DEFINER. ACLs remotas efetivas requerem verificação readonly pós-apply.';

create index if not exists idx_hml_hard_delete_audit_company_created
  on public.hml_hard_delete_audit_events (company_id, created_at desc);

alter table public.hml_hard_delete_audit_events enable row level security;

drop policy if exists hml_hard_delete_audit_select_super_admin
  on public.hml_hard_delete_audit_events;

create policy hml_hard_delete_audit_select_super_admin
  on public.hml_hard_delete_audit_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      inner join public.roles r on r.id = cm.role_id
      where cm.company_id = hml_hard_delete_audit_events.company_id
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

-- Append-only: bloqueia UPDATE/DELETE/TRUNCATE por qualquer role (incl. bypass via DML).
create or replace function public.hml_hard_delete_audit_events_immutable()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  raise exception 'hml_hard_delete_audit_events is append-only'
    using errcode = '42501';
end;
$$;

drop trigger if exists hml_hard_delete_audit_events_no_update
  on public.hml_hard_delete_audit_events;
create trigger hml_hard_delete_audit_events_no_update
  before update on public.hml_hard_delete_audit_events
  for each row execute function public.hml_hard_delete_audit_events_immutable();

drop trigger if exists hml_hard_delete_audit_events_no_delete
  on public.hml_hard_delete_audit_events;
create trigger hml_hard_delete_audit_events_no_delete
  before delete on public.hml_hard_delete_audit_events
  for each row execute function public.hml_hard_delete_audit_events_immutable();

drop trigger if exists hml_hard_delete_audit_events_no_truncate
  on public.hml_hard_delete_audit_events;
create trigger hml_hard_delete_audit_events_no_truncate
  before truncate on public.hml_hard_delete_audit_events
  for each statement execute function public.hml_hard_delete_audit_events_immutable();

revoke all on function public.hml_hard_delete_audit_events_immutable() from public;
revoke all on function public.hml_hard_delete_audit_events_immutable() from anon;
revoke all on function public.hml_hard_delete_audit_events_immutable() from authenticated;
revoke all on function public.hml_hard_delete_audit_events_immutable() from service_role;

revoke all on table public.hml_hard_delete_audit_events from public;
revoke all on table public.hml_hard_delete_audit_events from anon;
revoke all on table public.hml_hard_delete_audit_events from authenticated;
revoke all on table public.hml_hard_delete_audit_events from service_role;
-- Só SELECT para Super Admin via RLS; INSERT apenas pelo owner/definer da RPC.
grant select on table public.hml_hard_delete_audit_events to authenticated;

create or replace function public.hml_hard_delete_manifest_43(
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
  c_confirm text := 'HARD_DELETE_MANIFEST_43';
  c_guc text := 'app.allow_hml_hard_delete';
  c_project_guc text := 'app.hml_expected_project_ref';
  c_scope text := 'hml_manifest_43';

  v_actor uuid := auth.uid();
  v_guc text;
  v_project_guc text;
  v_is_membership_super_admin boolean;
  v_is_portal_master_acting boolean;
  v_hq_id uuid;
  v_hq_code text;
  v_present int := 0;
  v_absent int := 0;
  v_count int;
  v_deleted jsonb := '{}'::jsonb;
  v_result text;
  v_payload jsonb;

  -- Allowlist embutida (ordem = manifesto; deletes usam ordem de dependência)
  v_branch_imp uuid := 'ba3c7aaa-57d0-4f1a-b406-1871e25c9a84';
  v_branch_the uuid := '190c68ca-8a3d-4b62-9960-b0516215e3c6';
  v_cc_frota uuid := '6230f8f2-5615-4dd9-bbda-8fdb12785ff9';
  v_cc_manut uuid := 'e829ae85-5fad-4042-95aa-9ed6efae4bc2';
  v_cc_fin uuid := 'd4b4ba1c-bf62-495f-9e28-88ce33749740';
  v_pos_analista uuid := 'f003fee1-a3fe-4b7c-a775-4a70e97213cf';
  v_pos_aux uuid := 'b2647966-6a1a-4b8d-85d8-5d11a639e5b0';
  v_s01 uuid := '7ba15f45-a73e-428d-8724-13e5f3e66cb2';
  v_s02 uuid := '5b3010db-628d-4dca-9dd7-ea2545e29cde';
  v_s03 uuid := '65e71876-4617-46e3-8ed3-d5d890531665';
  v_s04 uuid := 'c0ba1762-8b04-4922-9bf2-2997a8b477fd';
  v_s05 uuid := 'cec1f6e6-5c23-4c36-9955-5a0931543822';
  v_s06 uuid := '30dbf51e-1638-4c8f-894d-3cfa0c72dc54';
  v_c01 uuid := '73e1e53e-c969-45a5-8783-34785ef16e45';
  v_c01_addr uuid := 'f1926546-39b5-4421-8d65-47e73119c632';
  v_c01_contact uuid := '3539c2e2-7b46-494a-ac5f-b0e833f82f0a';
  v_c01_contract uuid := '21208711-6975-4a55-b146-94a090fca772';
  v_c01_item1 uuid := '1529de21-f635-48f2-ae68-bd77743c0069';
  v_c01_item2 uuid := '521a0db9-86aa-49a9-b4fa-7b499ec01ad5';
  v_c02 uuid := '1d24560c-2b79-4da7-b96e-33d02fb41a78';
  v_c02_addr uuid := 'fc48c5fd-a499-44b3-8d19-4849c748ef09';
  v_c02_contact uuid := '7ea3b10c-2756-48a1-90d9-492113e895b5';
  v_c02_contract uuid := 'f6dba37c-68b6-4927-ba7b-a95faf431386';
  v_c02_item1 uuid := '061bdf27-9092-40f6-891e-2f3f6b154538';
  v_c02_item2 uuid := 'a1942bbf-9eff-42c1-aae9-e2dd15c1febd';
  v_c03 uuid := '3054338e-89e8-4407-8c4c-7a8603d8b8af';
  v_c03_addr uuid := 'ccb5b3b7-c34d-41d9-9c76-df64acbf102d';
  v_c03_contact uuid := 'a701a2c8-9c89-439b-82f5-ffbc7c9bd902';
  v_c03_contract uuid := '80bf0fc5-8519-4c4a-9858-63350fbce988';
  v_c03_item1 uuid := '687f69ba-ddd3-4ded-be53-d1215df1ef7c';
  v_c03_item2 uuid := '76b20c23-c923-4917-8326-72c3ac00353d';
  v_c04 uuid := '2a24985a-2626-4952-92d8-c333e673cdb1';
  v_c05 uuid := '3986f298-21a4-4970-b4dc-7ee0e689ce28';
  v_v01 uuid := 'f38981b2-c743-4ae7-aadf-3738bce0b27f';
  v_v02 uuid := '19e4dff6-0bf6-4a90-a015-a7651a9f0e6f';
  v_v03 uuid := 'b65da7ef-48fc-4cfe-83f2-d22b658da19b';
  v_v04 uuid := '8a04fd77-8148-4c7d-8606-e813cbe50014';
  v_v05 uuid := 'a348bb51-780b-431f-a4bc-a94c7c0f283f';
  v_v06 uuid := 'a052a55b-cfc3-4858-b4d3-ef4ff450241e';
  v_v07 uuid := '3c01c8da-e4d2-46e6-aaab-afebdebdd5ad';
  v_v08 uuid := 'cfcf4643-a907-4e15-a74d-745908ffd5d4';
  v_v09 uuid := 'fffd274a-5547-4bcc-9dae-1ca9d072680d';
  v_v10 uuid := '61b398cc-ba4a-4ff0-a8ab-a7f71974fac0';

  v_branch_ids uuid[];
  v_cc_ids uuid[];
  v_pos_ids uuid[];
  v_supplier_ids uuid[];
  v_customer_ids uuid[];
  v_address_ids uuid[];
  v_contact_ids uuid[];
  v_contract_ids uuid[];
  v_item_ids uuid[];
  v_vehicle_ids uuid[];
  v_all_ids uuid[];

  v_ch_ids uuid[];
  v_vh_ids uuid[];
  v_bad int;
begin
  -- ---- gates de autorização (membership Super Admin; GUC ≠ autenticação) ----
  if p_company_id is distinct from c_expected_company then
    raise exception 'hml_hard_delete: company_id não autorizado'
      using errcode = '42501';
  end if;

  if p_confirm is distinct from c_confirm then
    raise exception 'hml_hard_delete: confirmação inválida'
      using errcode = '42501';
  end if;

  v_guc := coalesce(current_setting(c_guc, true), '');
  if v_guc is distinct from c_confirm then
    raise exception 'hml_hard_delete: GUC app.allow_hml_hard_delete ausente ou inválida'
      using errcode = '42501';
  end if;

  -- Defesa em profundidade: CLI deve setar após validar host da URL.
  -- Não prova que a sessão está no projeto Supabase correto.
  v_project_guc := coalesce(current_setting(c_project_guc, true), '');
  if v_project_guc is distinct from c_expected_project_ref then
    raise exception
      'hml_hard_delete: GUC app.hml_expected_project_ref ausente ou divergente do ref embutido'
      using errcode = '42501';
  end if;

  if v_actor is null then
    raise exception 'hml_hard_delete: auth.uid() nulo'
      using errcode = '42501';
  end if;

  -- Portal Master acting NÃO autoriza esta operação (política explícita).
  v_is_portal_master_acting := public.is_portal_owner_acting_for(c_expected_company);
  if v_is_portal_master_acting is true then
    raise exception
      'hml_hard_delete: Portal Master acting não autorizado — exige membership Super Admin ou mecanismo Master formal separado'
      using errcode = '42501';
  end if;

  -- Membership Super Admin apenas (não usar is_company_super_admin: inclui Master).
  -- Exige r.company_id = cm.company_id (papel da mesma empresa da associação).
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
    raise exception 'hml_hard_delete: requer membership Super Admin da empresa-alvo'
      using errcode = '42501';
  end if;

  -- Mesma chave que hml_reset_company_business_data (103): serializa 102∥103
  -- na empresa HML. Não cobre writers da aplicação fora destas RPCs.
  perform pg_advisory_xact_lock(hashtextextended(c_expected_company::text, 0));

  v_branch_ids := array[v_branch_imp, v_branch_the];
  v_cc_ids := array[v_cc_frota, v_cc_manut, v_cc_fin];
  v_pos_ids := array[v_pos_analista, v_pos_aux];
  v_supplier_ids := array[v_s01, v_s02, v_s03, v_s04, v_s05, v_s06];
  v_customer_ids := array[v_c01, v_c02, v_c03, v_c04, v_c05];
  v_address_ids := array[v_c01_addr, v_c02_addr, v_c03_addr];
  v_contact_ids := array[v_c01_contact, v_c02_contact, v_c03_contact];
  v_contract_ids := array[v_c01_contract, v_c02_contract, v_c03_contract];
  v_item_ids := array[
    v_c01_item1, v_c01_item2, v_c02_item1, v_c02_item2, v_c03_item1, v_c03_item2
  ];
  v_vehicle_ids := array[
    v_v01, v_v02, v_v03, v_v04, v_v05, v_v06, v_v07, v_v08, v_v09, v_v10
  ];
  v_all_ids := v_branch_ids || v_cc_ids || v_pos_ids || v_supplier_ids
    || v_customer_ids || v_address_ids || v_contact_ids || v_contract_ids
    || v_item_ids || v_vehicle_ids;

  if cardinality(v_all_ids) <> 43 then
    raise exception 'hml_hard_delete: allowlist interna != 43';
  end if;

  -- ---- invariantes de preservação ----
  select id, code into v_hq_id, v_hq_code
  from public.branches
  where company_id = c_expected_company
    and is_headquarters = true
    and deleted_at is null;

  if v_hq_id is null or v_hq_code is distinct from 'HQ' then
    raise exception 'hml_hard_delete: HQ ausente ou code != HQ';
  end if;

  if v_hq_id = any (v_branch_ids) then
    raise exception 'hml_hard_delete: HQ está na allowlist — abort';
  end if;

  select count(*) into v_count
  from public.cost_centers
  where company_id = c_expected_company
    and is_system = true
    and deleted_at is null
    and id = any (v_cc_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: cost_center is_system na allowlist';
  end if;

  select count(*) into v_count
  from public.positions
  where company_id = c_expected_company
    and is_system = true
    and deleted_at is null
    and id = any (v_pos_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: position is_system na allowlist';
  end if;

  select count(*) into v_count
  from public.cost_centers
  where company_id = c_expected_company
    and is_system = true
    and deleted_at is null;
  if v_count < 1 then
    raise exception 'hml_hard_delete: nenhum cost_center de sistema ativo';
  end if;

  select count(*) into v_count
  from public.positions
  where company_id = c_expected_company
    and is_system = true
    and deleted_at is null;
  if v_count < 1 then
    raise exception 'hml_hard_delete: nenhum position de sistema ativo';
  end if;

  -- ---- presença dos 43 (tudo ou nada) ----
  select count(*) into v_count from public.branches
  where company_id = c_expected_company and id = any (v_branch_ids);
  v_present := v_present + v_count;
  v_absent := v_absent + (2 - v_count);

  select count(*) into v_count from public.branches
  where id = any (v_branch_ids)
    and (
      company_id is distinct from c_expected_company
      or is_headquarters = true
      or code not in ('HML-IMP', 'HML-THE')
    );
  if v_count > 0 then
    raise exception 'hml_hard_delete: branch allowlist inválida (empresa/HQ/code)';
  end if;

  select count(*) into v_count from public.cost_centers
  where company_id = c_expected_company and id = any (v_cc_ids);
  v_present := v_present + v_count;
  v_absent := v_absent + (3 - v_count);

  select count(*) into v_count from public.cost_centers
  where id = any (v_cc_ids)
    and (
      company_id is distinct from c_expected_company
      or is_system = true
      or code not in ('HML-FROTA', 'HML-MANUT', 'HML-FIN')
    );
  if v_count > 0 then
    raise exception 'hml_hard_delete: cost_center allowlist inválida';
  end if;

  select count(*) into v_count from public.positions
  where company_id = c_expected_company and id = any (v_pos_ids);
  v_present := v_present + v_count;
  v_absent := v_absent + (2 - v_count);

  select count(*) into v_count from public.positions
  where id = any (v_pos_ids)
    and (
      company_id is distinct from c_expected_company
      or is_system = true
      or code not in ('HML_ANALISTA_OPS', 'HML_AUX_LOG')
    );
  if v_count > 0 then
    raise exception 'hml_hard_delete: position allowlist inválida';
  end if;

  select count(*) into v_count from public.suppliers
  where company_id = c_expected_company and id = any (v_supplier_ids);
  v_present := v_present + v_count; v_absent := v_absent + (6 - v_count);

  select count(*) into v_count from public.customers
  where company_id = c_expected_company and id = any (v_customer_ids);
  v_present := v_present + v_count; v_absent := v_absent + (5 - v_count);

  select count(*) into v_count from public.customer_addresses
  where company_id = c_expected_company and id = any (v_address_ids);
  v_present := v_present + v_count; v_absent := v_absent + (3 - v_count);

  select count(*) into v_count from public.customer_contacts
  where company_id = c_expected_company and id = any (v_contact_ids);
  v_present := v_present + v_count; v_absent := v_absent + (3 - v_count);

  select count(*) into v_count from public.customer_contracts
  where company_id = c_expected_company and id = any (v_contract_ids);
  v_present := v_present + v_count; v_absent := v_absent + (3 - v_count);

  select count(*) into v_count from public.customer_contract_items
  where company_id = c_expected_company and id = any (v_item_ids);
  v_present := v_present + v_count; v_absent := v_absent + (6 - v_count);

  select count(*) into v_count from public.vehicles
  where company_id = c_expected_company and id = any (v_vehicle_ids);
  v_present := v_present + v_count; v_absent := v_absent + (10 - v_count);

  select count(*) into v_bad from (
    select id, company_id from public.suppliers where id = any (v_supplier_ids)
    union all select id, company_id from public.customers where id = any (v_customer_ids)
    union all select id, company_id from public.customer_addresses where id = any (v_address_ids)
    union all select id, company_id from public.customer_contacts where id = any (v_contact_ids)
    union all select id, company_id from public.customer_contracts where id = any (v_contract_ids)
    union all select id, company_id from public.customer_contract_items where id = any (v_item_ids)
    union all select id, company_id from public.vehicles where id = any (v_vehicle_ids)
  ) x
  where x.company_id is distinct from c_expected_company;
  if v_bad > 0 then
    raise exception 'hml_hard_delete: ID da allowlist pertence a outra empresa';
  end if;

  if v_present + v_absent <> 43 then
    raise exception 'hml_hard_delete: contagem de presença inconsistente';
  end if;

  if v_present > 0 and v_absent > 0 then
    raise exception
      'hml_hard_delete: estado parcial present=% absent=% — revisão humana',
      v_present, v_absent;
  end if;

  -- ---- locks de linha nos alvos presentes (reduz TOCTOU com inserts FK) ----
  -- FOR UPDATE conflita com FOR KEY SHARE das FKs; não desliga constraints.
  -- Limite: writers sem tocar nestas linhas/FKs ainda podem correr em paralelo.
  if v_present > 0 then
    perform 1 from public.branches
      where id = any (v_branch_ids) for update;
    perform 1 from public.cost_centers
      where id = any (v_cc_ids) for update;
    perform 1 from public.positions
      where id = any (v_pos_ids) for update;
    perform 1 from public.suppliers
      where id = any (v_supplier_ids) for update;
    perform 1 from public.customers
      where id = any (v_customer_ids) for update;
    perform 1 from public.customer_addresses
      where id = any (v_address_ids) for update;
    perform 1 from public.customer_contacts
      where id = any (v_contact_ids) for update;
    perform 1 from public.customer_contracts
      where id = any (v_contract_ids) for update;
    perform 1 from public.customer_contract_items
      where id = any (v_item_ids) for update;
    perform 1 from public.vehicles
      where id = any (v_vehicle_ids) for update;
  end if;

  -- ---- CASCADE: inventário de filhos antes de qualquer DELETE ----
  -- Endereços/contatos/contratos/itens: só os da allowlist; extras → abort.
  select count(*) into v_bad from public.customer_addresses
  where company_id = c_expected_company
    and customer_id = any (v_customer_ids)
    and id <> all (v_address_ids);
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_addresses filho fora da allowlist (CASCADE)';
  end if;

  select count(*) into v_bad from public.customer_addresses
  where id = any (v_address_ids)
    and (
      company_id is distinct from c_expected_company
      or customer_id is null
      or customer_id <> all (v_customer_ids)
    );
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_addresses allowlist com pai inválido';
  end if;

  select count(*) into v_bad from public.customer_contacts
  where company_id = c_expected_company
    and customer_id = any (v_customer_ids)
    and id <> all (v_contact_ids);
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_contacts filho fora da allowlist (CASCADE)';
  end if;

  select count(*) into v_bad from public.customer_contacts
  where id = any (v_contact_ids)
    and (
      company_id is distinct from c_expected_company
      or customer_id is null
      or customer_id <> all (v_customer_ids)
    );
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_contacts allowlist com pai inválido';
  end if;

  select count(*) into v_bad from public.customer_contracts
  where company_id = c_expected_company
    and customer_id = any (v_customer_ids)
    and id <> all (v_contract_ids);
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_contracts filho fora da allowlist';
  end if;

  select count(*) into v_bad from public.customer_contracts
  where id = any (v_contract_ids)
    and (
      company_id is distinct from c_expected_company
      or customer_id is null
      or customer_id <> all (v_customer_ids)
    );
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_contracts allowlist com pai inválido';
  end if;

  select count(*) into v_bad from public.customer_contract_items
  where company_id = c_expected_company
    and contract_id = any (v_contract_ids)
    and id <> all (v_item_ids);
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_contract_items filho fora da allowlist (CASCADE)';
  end if;

  select count(*) into v_bad from public.customer_contract_items
  where id = any (v_item_ids)
    and (
      company_id is distinct from c_expected_company
      or contract_id is null
      or contract_id <> all (v_contract_ids)
    );
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_contract_items allowlist com pai inválido';
  end if;

  -- Documentos: fora dos 43 — qualquer ocorrência sob pais do escopo aborta.
  select count(*) into v_count from public.customer_documents
  where company_id = c_expected_company
    and (
      customer_id = any (v_customer_ids)
      or contract_id = any (v_contract_ids)
    );
  if v_count > 0 then
    raise exception
      'hml_hard_delete: customer_documents sob escopo (%) — fora da allowlist CASCADE',
      v_count;
  end if;

  select count(*) into v_count from public.vehicle_documents
  where company_id = c_expected_company
    and vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception
      'hml_hard_delete: vehicle_documents sob escopo (%) — fora da allowlist CASCADE',
      v_count;
  end if;

  -- ---- histórico vinculado (único CASCADE filho não-allowlist permitido) ----
  select coalesce(array_agg(id), array[]::uuid[]) into v_ch_ids
  from public.customer_history
  where company_id = c_expected_company
    and (
      customer_id = any (v_customer_ids)
      or contract_id = any (v_contract_ids)
    );

  select count(*) into v_bad
  from public.customer_history
  where id = any (v_ch_ids)
    and (
      company_id is distinct from c_expected_company
      or customer_id is null
      or customer_id <> all (v_customer_ids)
      or (contract_id is not null and contract_id <> all (v_contract_ids))
    );
  if v_bad > 0 then
    raise exception 'hml_hard_delete: customer_history com vínculo fora da allowlist';
  end if;

  select coalesce(array_agg(id), array[]::uuid[]) into v_vh_ids
  from public.vehicle_history
  where company_id = c_expected_company
    and vehicle_id = any (v_vehicle_ids);

  select count(*) into v_bad
  from public.vehicle_history
  where id = any (v_vh_ids)
    and (
      company_id is distinct from c_expected_company
      or vehicle_id is null
      or vehicle_id <> all (v_vehicle_ids)
    );
  if v_bad > 0 then
    raise exception 'hml_hard_delete: vehicle_history com vínculo fora da allowlist';
  end if;

  if v_present = 0 then
    if cardinality(v_ch_ids) = 0 and cardinality(v_vh_ids) = 0 then
      insert into public.hml_hard_delete_audit_events (
        company_id, actor_profile_id, scope, result, counts, metadata
      ) values (
        c_expected_company,
        v_actor,
        c_scope,
        'already_clean',
        jsonb_build_object(),
        jsonb_build_object(
          'companyIdPrefix', left(c_expected_company::text, 8),
          'actorPrefix', left(v_actor::text, 8)
        )
      );
      return jsonb_build_object(
        'status', 'already_clean',
        'companyIdPrefix', left(c_expected_company::text, 8),
        'deleted', jsonb_build_object(),
        'actorPrefix', left(v_actor::text, 8),
        'audited', true
      );
    end if;
    raise exception
      'hml_hard_delete: alvos ausentes mas histórico residual permanece';
  end if;

  -- ---- refs externas SET NULL / RESTRICT (GLOBAL, incl. soft-deleted) ----
  -- Contagens SEM filtro company_id quando a FK é por id (H2: cross-tenant).
  -- Qualquer hit aborta. Exclui só IDs que serão apagados nesta transação.
  -- H1: customer_*.branch_id (067) cobertos abaixo.

  select count(*) into v_count from public.company_members
  where default_branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: company_members.default_branch_id aponta para filial HML';
  end if;

  select count(*) into v_count from public.vehicles
  where branch_id = any (v_branch_ids) and id <> all (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: veículo externo referencia filial HML';
  end if;

  select count(*) into v_count from public.customers
  where branch_id = any (v_branch_ids) and id <> all (v_customer_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: cliente externo referencia filial HML';
  end if;

  -- H1: filhos de clientes com branch_id HML fora da allowlist (SET NULL em 067)
  select count(*) into v_count from public.customer_addresses
  where branch_id = any (v_branch_ids) and id <> all (v_address_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_addresses.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.customer_contacts
  where branch_id = any (v_branch_ids) and id <> all (v_contact_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_contacts.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.customer_contracts
  where branch_id = any (v_branch_ids) and id <> all (v_contract_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_contracts.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.customer_contract_items
  where branch_id = any (v_branch_ids) and id <> all (v_item_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_contract_items.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.customer_documents
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_documents.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.customer_history
  where branch_id = any (v_branch_ids) and id <> all (v_ch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_history.branch_id fora do escopo';
  end if;

  select count(*) into v_count from public.drivers
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: drivers referencia filial HML';
  end if;

  select count(*) into v_count from public.employees
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: employees referencia filial HML';
  end if;

  select count(*) into v_count from public.payroll_expenses
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: payroll_expenses referencia filial HML';
  end if;

  select count(*) into v_count from public.routes
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: routes referencia filial HML';
  end if;

  select count(*) into v_count from public.financial_entries
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_entries.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.financial_categories
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_categories.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.financial_cost_centers
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_cost_centers.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.financial_documents
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_documents.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.financial_history
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_history.branch_id fora do escopo';
  end if;

  select count(*) into v_count from public.fuel_records
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: fuel_records.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.fuel_history
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: fuel_history.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.fuel_documents
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: fuel_documents.branch_id fora do escopo';
  end if;

  select count(*) into v_count from public.maintenance_records
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_records.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_schedules
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_schedules.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_history
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_history.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_documents
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_documents.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_parts
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_parts.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_services
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_services.branch_id fora do escopo';
  end if;

  select count(*) into v_count from public.tires
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tires.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_history
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_history.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_movements
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_movements.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_inspections
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_inspections.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_recaps
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_recaps.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_documents
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_documents.branch_id fora do escopo';
  end if;

  select count(*) into v_count from public.trips
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trips.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.trip_history
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trip_history.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.trip_expenses
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trip_expenses.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.trip_stops
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trip_stops.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.trip_occurrences
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trip_occurrences.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.trip_checklists
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trip_checklists.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.trip_documents
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trip_documents.branch_id fora do escopo';
  end if;
  select count(*) into v_count from public.trip_locations
  where branch_id = any (v_branch_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trip_locations.branch_id fora do escopo';
  end if;

  select count(*) into v_count from public.employees
  where cost_center_id = any (v_cc_ids) or position_id = any (v_pos_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: employees referencia centro/cargo HML';
  end if;

  select count(*) into v_count from public.payroll_expenses
  where cost_center_id = any (v_cc_ids) or position_id = any (v_pos_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: payroll_expenses referencia centro/cargo HML';
  end if;

  select count(*) into v_count from public.financial_entries
  where cost_center_id = any (v_cc_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_entries referencia cost_center HML';
  end if;

  select count(*) into v_count from public.financial_entries
  where supplier_id = any (v_supplier_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_entries referencia supplier HML';
  end if;
  select count(*) into v_count from public.fuel_records
  where supplier_id = any (v_supplier_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: fuel_records referencia supplier HML';
  end if;
  select count(*) into v_count from public.maintenance_records
  where supplier_id = any (v_supplier_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_records referencia supplier HML';
  end if;
  select count(*) into v_count from public.tires
  where supplier_id = any (v_supplier_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tires referencia supplier HML';
  end if;
  select count(*) into v_count from public.tire_recaps
  where supplier_id = any (v_supplier_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_recaps referencia supplier HML';
  end if;

  select count(*) into v_count from public.financial_entries
  where customer_id = any (v_customer_ids) or customer_contract_id = any (v_contract_ids)
       or vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_entries referencia cliente/contrato/veículo HML';
  end if;

  select count(*) into v_count from public.financial_categories
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_categories.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.financial_cost_centers
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_cost_centers.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.financial_documents
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_documents.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.financial_history
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: financial_history.vehicle_id fora do escopo';
  end if;

  select count(*) into v_count from public.routes
  where customer_id = any (v_customer_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: routes referencia customer HML';
  end if;

  select count(*) into v_count from public.trips
  where customer_id = any (v_customer_ids) or customer_contract_id = any (v_contract_ids)
       or vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: trips referencia customer/contrato/vehicle HML';
  end if;

  select count(*) into v_count from public.fuel_records
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: fuel_records referencia vehicle HML';
  end if;
  select count(*) into v_count from public.fuel_history
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: fuel_history.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.fuel_documents
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: fuel_documents.vehicle_id fora do escopo';
  end if;

  select count(*) into v_count from public.maintenance_records
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_records referencia vehicle HML';
  end if;
  select count(*) into v_count from public.maintenance_schedules
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_schedules referencia vehicle HML';
  end if;
  select count(*) into v_count from public.maintenance_history
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_history.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_documents
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_documents.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_parts
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_parts.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.maintenance_services
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: maintenance_services.vehicle_id fora do escopo';
  end if;

  select count(*) into v_count from public.tires
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tires referencia vehicle HML';
  end if;
  select count(*) into v_count from public.tire_history
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_history.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_movements
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_movements.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_inspections
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_inspections.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_recaps
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_recaps.vehicle_id fora do escopo';
  end if;
  select count(*) into v_count from public.tire_documents
  where vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: tire_documents.vehicle_id fora do escopo';
  end if;

  -- ---- DELETE (mesma transação) ----
  delete from public.customer_history
  where company_id = c_expected_company and id = any (v_ch_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_history', v_count);

  delete from public.vehicle_history
  where company_id = c_expected_company and id = any (v_vh_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('vehicle_history', v_count);

  delete from public.customer_contract_items
  where company_id = c_expected_company and id = any (v_item_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_contract_items', v_count);

  delete from public.customer_addresses
  where company_id = c_expected_company and id = any (v_address_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_addresses', v_count);

  delete from public.customer_contacts
  where company_id = c_expected_company and id = any (v_contact_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_contacts', v_count);

  delete from public.customer_contracts
  where company_id = c_expected_company and id = any (v_contract_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_contracts', v_count);

  delete from public.customer_history
  where company_id = c_expected_company
    and customer_id = any (v_customer_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customer_history_sweep', v_count);

  delete from public.customers
  where company_id = c_expected_company and id = any (v_customer_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('customers', v_count);

  delete from public.suppliers
  where company_id = c_expected_company and id = any (v_supplier_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('suppliers', v_count);

  delete from public.vehicles
  where company_id = c_expected_company and id = any (v_vehicle_ids);
  get diagnostics v_count = row_count;
  v_deleted := v_deleted || jsonb_build_object('vehicles', v_count);

  delete from public.cost_centers
  where company_id = c_expected_company
    and id = any (v_cc_ids)
    and is_system = false;
  get diagnostics v_count = row_count;
  if v_count <> 3 then
    raise exception 'hml_hard_delete: cost_centers deleted=% esperado 3', v_count;
  end if;
  v_deleted := v_deleted || jsonb_build_object('cost_centers', v_count);

  delete from public.positions
  where company_id = c_expected_company
    and id = any (v_pos_ids)
    and is_system = false;
  get diagnostics v_count = row_count;
  if v_count <> 2 then
    raise exception 'hml_hard_delete: positions deleted=% esperado 2', v_count;
  end if;
  v_deleted := v_deleted || jsonb_build_object('positions', v_count);

  delete from public.branches
  where company_id = c_expected_company
    and id = any (v_branch_ids)
    and is_headquarters = false
    and code in ('HML-IMP', 'HML-THE');
  get diagnostics v_count = row_count;
  if v_count <> 2 then
    raise exception 'hml_hard_delete: branches deleted=% esperado 2', v_count;
  end if;
  v_deleted := v_deleted || jsonb_build_object('branches', v_count);

  -- ---- pós-condições ----
  select count(*) into v_count from public.branches
  where company_id = c_expected_company
    and is_headquarters = true
    and deleted_at is null
    and code = 'HQ'
    and id = v_hq_id;
  if v_count <> 1 then
    raise exception 'hml_hard_delete: HQ não preservada após delete';
  end if;

  select count(*) into v_count from (
    select id from public.branches where id = any (v_branch_ids)
    union all select id from public.cost_centers where id = any (v_cc_ids)
    union all select id from public.positions where id = any (v_pos_ids)
    union all select id from public.suppliers where id = any (v_supplier_ids)
    union all select id from public.customers where id = any (v_customer_ids)
    union all select id from public.customer_addresses where id = any (v_address_ids)
    union all select id from public.customer_contacts where id = any (v_contact_ids)
    union all select id from public.customer_contracts where id = any (v_contract_ids)
    union all select id from public.customer_contract_items where id = any (v_item_ids)
    union all select id from public.vehicles where id = any (v_vehicle_ids)
  ) leftover;
  if v_count > 0 then
    raise exception 'hml_hard_delete: % alvos ainda presentes após delete', v_count;
  end if;

  select count(*) into v_count from public.customer_history
  where company_id = c_expected_company
    and (customer_id = any (v_customer_ids) or contract_id = any (v_contract_ids));
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_history residual';
  end if;

  select count(*) into v_count from public.vehicle_history
  where company_id = c_expected_company and vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: vehicle_history residual';
  end if;

  select count(*) into v_count from public.customer_documents
  where company_id = c_expected_company
    and (
      customer_id = any (v_customer_ids)
      or contract_id = any (v_contract_ids)
    );
  if v_count > 0 then
    raise exception 'hml_hard_delete: customer_documents residual';
  end if;

  select count(*) into v_count from public.vehicle_documents
  where company_id = c_expected_company and vehicle_id = any (v_vehicle_ids);
  if v_count > 0 then
    raise exception 'hml_hard_delete: vehicle_documents residual';
  end if;

  v_result := 'deleted';
  insert into public.hml_hard_delete_audit_events (
    company_id, actor_profile_id, scope, result, counts, metadata
  ) values (
    c_expected_company,
    v_actor,
    c_scope,
    v_result,
    v_deleted,
    jsonb_build_object(
      'companyIdPrefix', left(c_expected_company::text, 8),
      'actorPrefix', left(v_actor::text, 8),
      'hqPreserved', true
    )
  );

  v_payload := jsonb_build_object(
    'status', v_result,
    'companyIdPrefix', left(c_expected_company::text, 8),
    'deleted', v_deleted,
    'actorPrefix', left(v_actor::text, 8),
    'hqPreserved', true,
    'audited', true
  );
  return v_payload;
end;
$$;

comment on function public.hml_hard_delete_manifest_43(uuid, text) is
  'Hard-delete transacional dos 43 IDs do manifesto HML parcial + histórico vinculado. Exige membership Super Admin (não Portal Master), GUC operacional e confirm. NÃO invocar sem autorização humana. Desativar com DROP FUNCTION após o uso.';

revoke all on function public.hml_hard_delete_manifest_43(uuid, text) from public;
revoke all on function public.hml_hard_delete_manifest_43(uuid, text) from anon;
revoke all on function public.hml_hard_delete_manifest_43(uuid, text) from authenticated;
revoke all on function public.hml_hard_delete_manifest_43(uuid, text) from service_role;
-- Sem GRANT EXECUTE nesta migration. Reabilitação exige autorização humana + GRANT
-- explícito (ex.: to authenticated), ainda sujeito a membership Super Admin +
-- GUC operacional + confirm. GUC/confirm NÃO autenticam.
-- ACLs remotas efetivas (proacl/pg_default_acl) NÃO foram verificadas aqui.
