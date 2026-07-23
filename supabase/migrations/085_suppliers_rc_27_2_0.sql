-- RC 27.2.0 — Cadastro de Fornecedores (suppliers)
-- Retrocompatível: preserva colunas de texto livre; adiciona supplier_id;
-- migra nomes existentes para fornecedores quando possível.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

do $$ begin
  create type public.supplier_document_type as enum ('cnpj', 'cpf');
exception when duplicate_object then null;
end $$;

comment on type public.supplier_document_type is 'Documento do fornecedor: CNPJ (PJ) ou CPF (PF)';

do $$ begin
  create type public.supplier_category as enum (
    'posto',
    'oficina',
    'auto_pecas',
    'pneus',
    'borracharia',
    'guincho',
    'lavagem',
    'eletrica',
    'mecanica',
    'lanternagem',
    'administrativo',
    'outros'
  );
exception when duplicate_object then null;
end $$;

comment on type public.supplier_category is 'Categorias operacionais do fornecedor (múltiplas por registro)';

-- ---------------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------------

create table if not exists public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  corporate_name  text not null,
  trade_name      text,
  document        text,
  document_type   public.supplier_document_type,
  categories      public.supplier_category[] not null default '{}'::public.supplier_category[],
  phone           text,
  email           text,
  contact_name    text,
  zip_code        text,
  address         text,
  number          text,
  district        text,
  city            text,
  state           text,
  active          boolean not null default true,
  notes           text,
  -- Evolução futura (não implementar agora): rating, SLA, ranking, docs, contratos
  metadata        jsonb not null default '{}'::jsonb,
  status          public.entity_status not null default 'active',
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,

  constraint suppliers_corporate_name_not_empty check (length(trim(corporate_name)) > 0),
  constraint suppliers_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint suppliers_document_type_consistent check (
    document is null
    or document_type is not null
  )
);

create unique index if not exists idx_suppliers_company_document_active
  on public.suppliers (company_id, document)
  where deleted_at is null and document is not null;

create index if not exists idx_suppliers_company_active
  on public.suppliers (company_id)
  where deleted_at is null;

create index if not exists idx_suppliers_company_active_flag
  on public.suppliers (company_id, active)
  where deleted_at is null;

create index if not exists idx_suppliers_company_city_state
  on public.suppliers (company_id, city, state)
  where deleted_at is null;

create index if not exists idx_suppliers_company_corporate_name
  on public.suppliers (company_id, corporate_name)
  where deleted_at is null;

create index if not exists idx_suppliers_categories_gin
  on public.suppliers using gin (categories)
  where deleted_at is null;

create index if not exists idx_suppliers_company_created_at
  on public.suppliers (company_id, created_at desc)
  where deleted_at is null;

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row
  execute function public.set_updated_at();

alter table public.suppliers enable row level security;

comment on table public.suppliers is
  'Fornecedores (PJ/PF) reutilizados por manutenção, abastecimento, pneus, compras e financeiro';

comment on column public.suppliers.metadata is
  'Extensível: rating, sla_days, avg_payment_term_days, ranking_score, contract_alerts, etc.';

comment on column public.suppliers.categories is
  'Múltiplas categorias (posto, oficina, pneus, …)';

-- ---------------------------------------------------------------------------
-- FK supplier_id nas tabelas consumidoras (preserva texto livre)
-- ---------------------------------------------------------------------------

alter table public.financial_entries
  add column if not exists supplier_id uuid
    references public.suppliers (id) on delete set null;

alter table public.maintenance_records
  add column if not exists supplier_id uuid
    references public.suppliers (id) on delete set null;

alter table public.tires
  add column if not exists supplier_id uuid
    references public.suppliers (id) on delete set null;

alter table public.tire_recaps
  add column if not exists supplier_id uuid
    references public.suppliers (id) on delete set null;

alter table public.fuel_records
  add column if not exists supplier_id uuid
    references public.suppliers (id) on delete set null;

create index if not exists idx_financial_entries_company_supplier_id
  on public.financial_entries (company_id, supplier_id)
  where deleted_at is null and supplier_id is not null;

create index if not exists idx_maintenance_records_company_supplier_id
  on public.maintenance_records (company_id, supplier_id)
  where deleted_at is null and supplier_id is not null;

create index if not exists idx_tires_company_supplier_id
  on public.tires (company_id, supplier_id)
  where deleted_at is null and supplier_id is not null;

create index if not exists idx_tire_recaps_company_supplier_id
  on public.tire_recaps (company_id, supplier_id)
  where deleted_at is null and supplier_id is not null;

create index if not exists idx_fuel_records_company_supplier_id
  on public.fuel_records (company_id, supplier_id)
  where deleted_at is null and supplier_id is not null;

comment on column public.financial_entries.supplier_id is
  'FK para suppliers; coluna supplier permanece como nome denormalizado para busca/exibição';

comment on column public.maintenance_records.supplier_id is
  'FK para suppliers; coluna supplier permanece denormalizada';

comment on column public.fuel_records.supplier_id is
  'FK para suppliers (posto); station_name permanece denormalizado';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

drop policy if exists suppliers_select_authorized on public.suppliers;
create policy suppliers_select_authorized
  on public.suppliers
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'suppliers:read')
      or public.is_company_super_admin(company_id)
    )
  );

drop policy if exists suppliers_insert_authorized on public.suppliers;
create policy suppliers_insert_authorized
  on public.suppliers
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'suppliers:create')
    or public.is_company_super_admin(company_id)
  );

drop policy if exists suppliers_update_authorized on public.suppliers;
create policy suppliers_update_authorized
  on public.suppliers
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'suppliers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'suppliers:update')
    or public.is_company_super_admin(company_id)
  );

drop policy if exists suppliers_delete_authorized on public.suppliers;
create policy suppliers_delete_authorized
  on public.suppliers
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'suppliers:delete')
    or public.is_company_super_admin(company_id)
  );

grant select, insert, update, delete on public.suppliers to authenticated;

-- ---------------------------------------------------------------------------
-- Permissions + role seed
-- ---------------------------------------------------------------------------

insert into public.permissions (code, resource, action, description)
values
  ('suppliers:read',   'suppliers', 'read',   'View suppliers'),
  ('suppliers:create', 'suppliers', 'create', 'Create suppliers'),
  ('suppliers:update', 'suppliers', 'update', 'Update suppliers'),
  ('suppliers:delete', 'suppliers', 'delete', 'Delete / inactivate suppliers')
on conflict (code) do update
set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = timezone('utc', now());

insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and p.code in ('suppliers:read', 'suppliers:create', 'suppliers:update', 'suppliers:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('suppliers:read', 'suppliers:create', 'suppliers:update'))
    or (r.name = 'Operator' and p.code = 'suppliers:read')
  )
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Migração retrocompatível de nomes livres → suppliers
-- ---------------------------------------------------------------------------

create or replace function public.migrate_free_text_suppliers()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_supplier_id uuid;
  v_name text;
  v_display text;
begin
  -- financial_entries.supplier
  for v_row in
    select distinct company_id, upper(trim(supplier)) as name_key, trim(supplier) as raw_name
    from public.financial_entries
    where deleted_at is null
      and supplier is not null
      and length(trim(supplier)) > 0
      and supplier_id is null
  loop
    v_name := v_row.name_key;
    v_display := v_row.raw_name;

    select id into v_supplier_id
    from public.suppliers
    where company_id = v_row.company_id
      and deleted_at is null
      and upper(trim(corporate_name)) = v_name
    limit 1;

    if v_supplier_id is null then
      insert into public.suppliers (company_id, corporate_name, trade_name, categories, active)
      values (
        v_row.company_id,
        v_display,
        v_display,
        array['outros']::public.supplier_category[],
        true
      )
      returning id into v_supplier_id;
    end if;

    update public.financial_entries
    set supplier_id = v_supplier_id
    where company_id = v_row.company_id
      and deleted_at is null
      and supplier_id is null
      and upper(trim(supplier)) = v_name;
  end loop;

  -- maintenance_records.supplier
  for v_row in
    select distinct company_id, upper(trim(supplier)) as name_key, trim(supplier) as raw_name
    from public.maintenance_records
    where deleted_at is null
      and supplier is not null
      and length(trim(supplier)) > 0
      and supplier_id is null
  loop
    v_name := v_row.name_key;
    v_display := v_row.raw_name;

    select id into v_supplier_id
    from public.suppliers
    where company_id = v_row.company_id
      and deleted_at is null
      and upper(trim(corporate_name)) = v_name
    limit 1;

    if v_supplier_id is null then
      insert into public.suppliers (company_id, corporate_name, trade_name, categories, active)
      values (
        v_row.company_id,
        v_display,
        v_display,
        array['oficina']::public.supplier_category[],
        true
      )
      returning id into v_supplier_id;
    end if;

    update public.maintenance_records
    set supplier_id = v_supplier_id
    where company_id = v_row.company_id
      and deleted_at is null
      and supplier_id is null
      and upper(trim(supplier)) = v_name;

    update public.financial_entries
    set supplier_id = coalesce(supplier_id, v_supplier_id)
    where company_id = v_row.company_id
      and deleted_at is null
      and supplier_id is null
      and upper(trim(coalesce(supplier, ''))) = v_name;
  end loop;

  -- tires.supplier
  for v_row in
    select distinct company_id, upper(trim(supplier)) as name_key, trim(supplier) as raw_name
    from public.tires
    where deleted_at is null
      and supplier is not null
      and length(trim(supplier)) > 0
      and supplier_id is null
  loop
    v_name := v_row.name_key;
    v_display := v_row.raw_name;

    select id into v_supplier_id
    from public.suppliers
    where company_id = v_row.company_id
      and deleted_at is null
      and upper(trim(corporate_name)) = v_name
    limit 1;

    if v_supplier_id is null then
      insert into public.suppliers (company_id, corporate_name, trade_name, categories, active)
      values (
        v_row.company_id,
        v_display,
        v_display,
        array['pneus']::public.supplier_category[],
        true
      )
      returning id into v_supplier_id;
    end if;

    update public.tires
    set supplier_id = v_supplier_id
    where company_id = v_row.company_id
      and deleted_at is null
      and supplier_id is null
      and upper(trim(supplier)) = v_name;
  end loop;

  -- tire_recaps.supplier
  for v_row in
    select distinct tr.company_id, upper(trim(tr.supplier)) as name_key, trim(tr.supplier) as raw_name
    from public.tire_recaps tr
    where tr.deleted_at is null
      and tr.supplier is not null
      and length(trim(tr.supplier)) > 0
      and tr.supplier_id is null
  loop
    v_name := v_row.name_key;
    v_display := v_row.raw_name;

    select id into v_supplier_id
    from public.suppliers
    where company_id = v_row.company_id
      and deleted_at is null
      and upper(trim(corporate_name)) = v_name
    limit 1;

    if v_supplier_id is null then
      insert into public.suppliers (company_id, corporate_name, trade_name, categories, active)
      values (
        v_row.company_id,
        v_display,
        v_display,
        array['borracharia']::public.supplier_category[],
        true
      )
      returning id into v_supplier_id;
    end if;

    update public.tire_recaps
    set supplier_id = v_supplier_id
    where company_id = v_row.company_id
      and deleted_at is null
      and supplier_id is null
      and upper(trim(supplier)) = v_name;
  end loop;

  -- fuel_records.station_name → posto
  for v_row in
    select distinct company_id, upper(trim(station_name)) as name_key, trim(station_name) as raw_name
    from public.fuel_records
    where deleted_at is null
      and station_name is not null
      and length(trim(station_name)) > 0
      and supplier_id is null
  loop
    v_name := v_row.name_key;
    v_display := v_row.raw_name;

    select id into v_supplier_id
    from public.suppliers
    where company_id = v_row.company_id
      and deleted_at is null
      and upper(trim(corporate_name)) = v_name
    limit 1;

    if v_supplier_id is null then
      insert into public.suppliers (company_id, corporate_name, trade_name, categories, active)
      values (
        v_row.company_id,
        v_display,
        v_display,
        array['posto']::public.supplier_category[],
        true
      )
      returning id into v_supplier_id;
    end if;

    update public.fuel_records
    set supplier_id = v_supplier_id
    where company_id = v_row.company_id
      and deleted_at is null
      and supplier_id is null
      and upper(trim(station_name)) = v_name;

    update public.financial_entries
    set supplier_id = coalesce(supplier_id, v_supplier_id),
        supplier = coalesce(nullif(trim(supplier), ''), v_display)
    where company_id = v_row.company_id
      and deleted_at is null
      and supplier_id is null
      and upper(trim(coalesce(supplier, ''))) = v_name;
  end loop;
end;
$$;

comment on function public.migrate_free_text_suppliers() is
  'Migra nomes livres de fornecedor/posto para a tabela suppliers e preenche supplier_id';

select public.migrate_free_text_suppliers();

-- ---------------------------------------------------------------------------
-- Stats RPC — ficha / resumo financeiro do fornecedor
-- ---------------------------------------------------------------------------

create or replace function public.get_supplier_stats(
  p_company_id uuid,
  p_supplier_id uuid
)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with entries as (
    select
      fe.id,
      fe.entry_type,
      fe.entry_status,
      fe.amount,
      fe.entry_date,
      fe.due_date,
      fe.paid_at,
      fe.source_module,
      fe.maintenance_record_id,
      fe.fuel_record_id,
      fe.tire_id
    from public.financial_entries fe
    where fe.company_id = p_company_id
      and fe.supplier_id = p_supplier_id
      and fe.deleted_at is null
      and fe.entry_status not in ('cancelled', 'reversed')
      and fe.entry_type not in ('reversal')
  ),
  maint as (
    select count(*)::int as qty, max(opened_at) as last_at
    from public.maintenance_records
    where company_id = p_company_id
      and supplier_id = p_supplier_id
      and deleted_at is null
  ),
  fuel as (
    select count(*)::int as qty, max(fueled_at) as last_at
    from public.fuel_records
    where company_id = p_company_id
      and supplier_id = p_supplier_id
      and deleted_at is null
  ),
  tire_purchases as (
    select count(*)::int as qty, max(purchase_date) as last_at
    from public.tires
    where company_id = p_company_id
      and supplier_id = p_supplier_id
      and deleted_at is null
  )
  select json_build_object(
    'total_spent', coalesce((
      select round(sum(amount)::numeric, 2) from entries where entry_type = 'expense'
    ), 0),
    'total_revenue', coalesce((
      select round(sum(amount)::numeric, 2) from entries where entry_type = 'revenue'
    ), 0),
    'service_count', coalesce((
      select (select qty from maint) + (select qty from fuel) + (select qty from tire_purchases)
    ), 0),
    'order_count', coalesce((select count(*)::int from entries where entry_type = 'expense'), 0),
    'average_order_amount', coalesce((
      select round(avg(amount)::numeric, 2) from entries where entry_type = 'expense'
    ), 0),
    'open_payables', coalesce((
      select round(sum(amount)::numeric, 2)
      from entries
      where entry_type = 'expense' and entry_status in ('pending', 'overdue')
    ), 0),
    'paid_payables', coalesce((
      select round(sum(amount)::numeric, 2)
      from entries
      where entry_type = 'expense' and entry_status = 'paid'
    ), 0),
    'open_installments', coalesce((
      select count(*)::int
      from entries
      where entry_type = 'expense' and entry_status in ('pending', 'overdue')
    ), 0),
    'paid_installments', coalesce((
      select count(*)::int
      from entries
      where entry_type = 'expense' and entry_status = 'paid'
    ), 0),
    'last_purchase_at', (
      select greatest(
        (select last_at from tire_purchases),
        (select max(entry_date::timestamptz) from entries where entry_type = 'expense')
      )
    ),
    'last_fuel_at', (select last_at from fuel),
    'last_maintenance_at', (select last_at from maint),
    'maintenance_count', (select qty from maint),
    'fuel_count', (select qty from fuel),
    'tire_count', (select qty from tire_purchases)
  );
$$;

comment on function public.get_supplier_stats(uuid, uuid) is
  'Agregados financeiros e operacionais do fornecedor (reutiliza financial_entries)';

grant execute on function public.get_supplier_stats(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Analytics stubs (estrutura para análises futuras — não materializa rankings)
-- ---------------------------------------------------------------------------

create or replace function public.get_supplier_analytics_placeholders(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  select json_build_object(
    'company_id', p_company_id,
    'ready', true,
    'metrics', json_build_array(
      'top_10_suppliers',
      'highest_spend',
      'most_services',
      'highest_avg_payment_term',
      'highest_operational_cost'
    ),
    'note', 'RC 27.2.0 — estrutura preparada; implementação futura'
  );
$$;

comment on function public.get_supplier_analytics_placeholders(uuid) is
  'Placeholder de analytics de fornecedores (top 10, maior gasto, etc.) — não implementar agora';

grant execute on function public.get_supplier_analytics_placeholders(uuid) to authenticated;
