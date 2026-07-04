-- FleetControl Sprint 24 — customers, contracts, related tables, history and stats

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

create table public.customers (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies (id) on delete restrict,
  branch_id               uuid references public.branches (id) on delete set null,
  legal_name              text not null,
  trade_name              text,
  tax_id                  text,
  state_registration      text,
  municipal_registration  text,
  email                   text,
  phone                   text,
  whatsapp                text,
  website                 text,
  customer_status         public.customer_status not null default 'active',
  segment                 public.customer_segment,
  notes                   text,
  sales_representative    text,
  credit_limit            numeric(14, 2),
  payment_term_days       integer,
  metadata                jsonb not null default '{}'::jsonb,
  status                  public.entity_status not null default 'active',
  external_id             text,
  integration_source      text,
  created_at              timestamptz not null default timezone('utc', now()),
  updated_at              timestamptz not null default timezone('utc', now()),
  deleted_at              timestamptz,
  created_by              uuid references public.profiles (id) on delete set null,
  updated_by              uuid references public.profiles (id) on delete set null,

  constraint customers_legal_name_not_empty check (length(trim(legal_name)) > 0),
  constraint customers_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint customers_credit_limit_non_negative check (credit_limit is null or credit_limit >= 0),
  constraint customers_payment_term_non_negative check (payment_term_days is null or payment_term_days >= 0)
);

create unique index idx_customers_company_tax_id_active
  on public.customers (company_id, tax_id)
  where deleted_at is null and tax_id is not null;

create index idx_customers_company_id_active
  on public.customers (company_id)
  where deleted_at is null;

create index idx_customers_company_branch_active
  on public.customers (company_id, branch_id)
  where deleted_at is null;

create index idx_customers_company_status
  on public.customers (company_id, customer_status)
  where deleted_at is null;

create index idx_customers_company_segment
  on public.customers (company_id, segment)
  where deleted_at is null and segment is not null;

create index idx_customers_company_sales_rep
  on public.customers (company_id, sales_representative)
  where deleted_at is null and sales_representative is not null;

create index idx_customers_company_created_at
  on public.customers (company_id, created_at desc)
  where deleted_at is null;

create index idx_customers_company_external_id
  on public.customers (company_id, integration_source, external_id)
  where deleted_at is null and external_id is not null;

create trigger customers_set_updated_at
  before update on public.customers
  for each row
  execute function public.set_updated_at();

alter table public.customers enable row level security;

comment on table public.customers is 'Customers served by the transport company';

-- ---------------------------------------------------------------------------
-- customer_addresses
-- ---------------------------------------------------------------------------

create table public.customer_addresses (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  branch_id       uuid references public.branches (id) on delete set null,
  customer_id     uuid not null references public.customers (id) on delete cascade,
  address_type    public.customer_address_type not null default 'headquarters',
  label           text,
  street          text,
  number          text,
  complement      text,
  neighborhood    text,
  city            text,
  state           text,
  zip_code        text,
  country         text not null default 'BR',
  is_primary      boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  status          public.entity_status not null default 'active',
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,

  constraint customer_addresses_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_customer_addresses_customer_active
  on public.customer_addresses (customer_id)
  where deleted_at is null;

create index idx_customer_addresses_company_customer
  on public.customer_addresses (company_id, customer_id)
  where deleted_at is null;

create index idx_customer_addresses_city_state
  on public.customer_addresses (company_id, city, state)
  where deleted_at is null and city is not null;

create trigger customer_addresses_set_updated_at
  before update on public.customer_addresses
  for each row
  execute function public.set_updated_at();

alter table public.customer_addresses enable row level security;

comment on table public.customer_addresses is 'Multiple addresses per customer';

-- ---------------------------------------------------------------------------
-- customer_contacts
-- ---------------------------------------------------------------------------

create table public.customer_contacts (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies (id) on delete restrict,
  branch_id       uuid references public.branches (id) on delete set null,
  customer_id     uuid not null references public.customers (id) on delete cascade,
  name            text not null,
  job_title       text,
  phone           text,
  whatsapp        text,
  email           text,
  is_primary      boolean not null default false,
  metadata        jsonb not null default '{}'::jsonb,
  status          public.entity_status not null default 'active',
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  created_by      uuid references public.profiles (id) on delete set null,
  updated_by      uuid references public.profiles (id) on delete set null,

  constraint customer_contacts_name_not_empty check (length(trim(name)) > 0),
  constraint customer_contacts_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_customer_contacts_customer_active
  on public.customer_contacts (customer_id)
  where deleted_at is null;

create index idx_customer_contacts_company_customer
  on public.customer_contacts (company_id, customer_id)
  where deleted_at is null;

create trigger customer_contacts_set_updated_at
  before update on public.customer_contacts
  for each row
  execute function public.set_updated_at();

alter table public.customer_contacts enable row level security;

comment on table public.customer_contacts is 'Contact persons for customers';

-- ---------------------------------------------------------------------------
-- customer_contracts
-- ---------------------------------------------------------------------------

create table public.customer_contracts (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  branch_id             uuid references public.branches (id) on delete set null,
  customer_id           uuid not null references public.customers (id) on delete restrict,
  contract_number       text not null,
  contract_status       public.customer_contract_status not null default 'draft',
  starts_at             date,
  ends_at               date,
  contract_type         public.customer_contract_type not null default 'spot',
  freight_table         text,
  currency                text not null default 'BRL',
  notes                 text,
  readjustment_index    public.customer_readjustment_index not null default 'none',
  readjustment_notes    text,
  contracted_revenue    numeric(14, 2) not null default 0,
  metadata              jsonb not null default '{}'::jsonb,
  status                public.entity_status not null default 'active',
  external_id           text,
  integration_source    text,
  created_at            timestamptz not null default timezone('utc', now()),
  updated_at            timestamptz not null default timezone('utc', now()),
  deleted_at            timestamptz,
  created_by            uuid references public.profiles (id) on delete set null,
  updated_by            uuid references public.profiles (id) on delete set null,

  constraint customer_contracts_number_not_empty check (length(trim(contract_number)) > 0),
  constraint customer_contracts_currency_not_empty check (length(trim(currency)) > 0),
  constraint customer_contracts_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint customer_contracts_date_range check (
    ends_at is null or starts_at is null or ends_at >= starts_at
  ),
  constraint customer_contracts_revenue_non_negative check (contracted_revenue >= 0)
);

create unique index idx_customer_contracts_company_number_active
  on public.customer_contracts (company_id, contract_number)
  where deleted_at is null;

create index idx_customer_contracts_company_customer
  on public.customer_contracts (company_id, customer_id)
  where deleted_at is null;

create index idx_customer_contracts_company_status
  on public.customer_contracts (company_id, contract_status)
  where deleted_at is null;

create index idx_customer_contracts_company_ends_at
  on public.customer_contracts (company_id, ends_at)
  where deleted_at is null and ends_at is not null;

create index idx_customer_contracts_company_created_at
  on public.customer_contracts (company_id, created_at desc)
  where deleted_at is null;

create trigger customer_contracts_set_updated_at
  before update on public.customer_contracts
  for each row
  execute function public.set_updated_at();

alter table public.customer_contracts enable row level security;

comment on table public.customer_contracts is 'Commercial contracts with customers';

-- ---------------------------------------------------------------------------
-- customer_contract_items
-- ---------------------------------------------------------------------------

create table public.customer_contract_items (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies (id) on delete restrict,
  branch_id         uuid references public.branches (id) on delete set null,
  contract_id       uuid not null references public.customer_contracts (id) on delete cascade,
  origin            text,
  destination       text,
  freight_value     numeric(14, 2),
  minimum_value     numeric(14, 2),
  weight_kg         numeric(12, 2),
  volume_m3         numeric(12, 4),
  toll_included     boolean not null default false,
  gris_percent      numeric(6, 4),
  insurance_percent numeric(6, 4),
  additional_value  numeric(14, 2),
  delivery_days     integer,
  metadata          jsonb not null default '{}'::jsonb,
  status            public.entity_status not null default 'active',
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  deleted_at        timestamptz,
  created_by        uuid references public.profiles (id) on delete set null,
  updated_by        uuid references public.profiles (id) on delete set null,

  constraint customer_contract_items_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint customer_contract_items_freight_non_negative check (freight_value is null or freight_value >= 0),
  constraint customer_contract_items_minimum_non_negative check (minimum_value is null or minimum_value >= 0),
  constraint customer_contract_items_delivery_days_non_negative check (delivery_days is null or delivery_days >= 0)
);

create index idx_customer_contract_items_contract_active
  on public.customer_contract_items (contract_id)
  where deleted_at is null;

create index idx_customer_contract_items_company_contract
  on public.customer_contract_items (company_id, contract_id)
  where deleted_at is null;

create index idx_customer_contract_items_origin_destination
  on public.customer_contract_items (company_id, origin, destination)
  where deleted_at is null;

create trigger customer_contract_items_set_updated_at
  before update on public.customer_contract_items
  for each row
  execute function public.set_updated_at();

alter table public.customer_contract_items enable row level security;

comment on table public.customer_contract_items is 'Freight route items within a customer contract';

-- ---------------------------------------------------------------------------
-- customer_documents
-- ---------------------------------------------------------------------------

create table public.customer_documents (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete restrict,
  branch_id      uuid references public.branches (id) on delete set null,
  customer_id    uuid not null references public.customers (id) on delete cascade,
  contract_id    uuid references public.customer_contracts (id) on delete set null,
  name           text not null,
  file_url       text not null,
  storage_path   text,
  document_type  public.customer_document_type not null default 'other',
  mime_type      text,
  file_size      integer,
  metadata       jsonb not null default '{}'::jsonb,
  status         public.entity_status not null default 'active',
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),
  deleted_at     timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,

  constraint customer_documents_name_not_empty check (length(trim(name)) > 0),
  constraint customer_documents_file_url_not_empty check (length(trim(file_url)) > 0),
  constraint customer_documents_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_customer_documents_customer_active
  on public.customer_documents (customer_id)
  where deleted_at is null;

create index idx_customer_documents_company_customer
  on public.customer_documents (company_id, customer_id)
  where deleted_at is null;

create index idx_customer_documents_contract
  on public.customer_documents (contract_id)
  where deleted_at is null and contract_id is not null;

create trigger customer_documents_set_updated_at
  before update on public.customer_documents
  for each row
  execute function public.set_updated_at();

alter table public.customer_documents enable row level security;

comment on table public.customer_documents is 'Documents attached to customers and contracts';

-- ---------------------------------------------------------------------------
-- customer_history
-- ---------------------------------------------------------------------------

create table public.customer_history (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references public.companies (id) on delete restrict,
  branch_id               uuid references public.branches (id) on delete set null,
  customer_id             uuid not null references public.customers (id) on delete cascade,
  contract_id             uuid references public.customer_contracts (id) on delete set null,
  action                  text not null,
  changes                 jsonb not null default '{}'::jsonb,
  previous_customer_status public.customer_status,
  new_customer_status     public.customer_status,
  previous_contract_status public.customer_contract_status,
  new_contract_status     public.customer_contract_status,
  metadata                jsonb not null default '{}'::jsonb,
  status                  public.entity_status not null default 'active',
  created_at              timestamptz not null default timezone('utc', now()),
  updated_at              timestamptz not null default timezone('utc', now()),
  deleted_at              timestamptz,
  created_by              uuid references public.profiles (id) on delete set null,
  updated_by              uuid references public.profiles (id) on delete set null,

  constraint customer_history_action_not_empty check (length(trim(action)) > 0),
  constraint customer_history_changes_is_object check (jsonb_typeof(changes) = 'object'),
  constraint customer_history_metadata_is_object check (jsonb_typeof(metadata) = 'object')
);

create index idx_customer_history_customer_created
  on public.customer_history (customer_id, created_at desc);

create index idx_customer_history_company_customer
  on public.customer_history (company_id, customer_id);

create index idx_customer_history_contract
  on public.customer_history (contract_id)
  where contract_id is not null;

create trigger customer_history_set_updated_at
  before update on public.customer_history
  for each row
  execute function public.set_updated_at();

alter table public.customer_history enable row level security;

comment on table public.customer_history is 'Audit trail for customers and contracts';

-- ---------------------------------------------------------------------------
-- History triggers — customers
-- ---------------------------------------------------------------------------

create or replace function public.log_customer_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_action text := 'update';
  v_actor uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.customer_history (
      company_id, branch_id, customer_id, action, changes,
      new_customer_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.id, 'create',
      jsonb_build_object(
        'legal_name', new.legal_name,
        'trade_name', new.trade_name,
        'tax_id', new.tax_id,
        'customer_status', new.customer_status
      ),
      new.customer_status,
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.customer_history (
        company_id, branch_id, customer_id, action, changes,
        previous_customer_status, new_customer_status, created_by
      )
      values (
        new.company_id, new.branch_id, new.id, 'delete',
        jsonb_build_object('deleted_at', new.deleted_at),
        old.customer_status, new.customer_status, v_actor
      );
      return new;
    end if;

    if old.customer_status is distinct from new.customer_status then
      v_action := 'status_change';
    end if;

    if old.legal_name is distinct from new.legal_name then
      v_changes := v_changes || jsonb_build_object('legal_name', jsonb_build_object('from', old.legal_name, 'to', new.legal_name));
    end if;
    if old.trade_name is distinct from new.trade_name then
      v_changes := v_changes || jsonb_build_object('trade_name', jsonb_build_object('from', old.trade_name, 'to', new.trade_name));
    end if;
    if old.tax_id is distinct from new.tax_id then
      v_changes := v_changes || jsonb_build_object('tax_id', jsonb_build_object('from', old.tax_id, 'to', new.tax_id));
    end if;
    if old.customer_status is distinct from new.customer_status then
      v_changes := v_changes || jsonb_build_object('customer_status', jsonb_build_object('from', old.customer_status, 'to', new.customer_status));
    end if;
    if old.credit_limit is distinct from new.credit_limit then
      v_changes := v_changes || jsonb_build_object('credit_limit', jsonb_build_object('from', old.credit_limit, 'to', new.credit_limit));
    end if;
    if old.sales_representative is distinct from new.sales_representative then
      v_changes := v_changes || jsonb_build_object('sales_representative', jsonb_build_object('from', old.sales_representative, 'to', new.sales_representative));
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.customer_history (
      company_id, branch_id, customer_id, action, changes,
      previous_customer_status, new_customer_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.id, v_action, v_changes,
      old.customer_status, new.customer_status, v_actor
    );
    return new;
  end if;

  return new;
end;
$$;

create trigger customers_log_history
  after insert or update on public.customers
  for each row
  execute function public.log_customer_history();

-- ---------------------------------------------------------------------------
-- History triggers — contracts
-- ---------------------------------------------------------------------------

create or replace function public.log_customer_contract_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_action text := 'update';
  v_actor uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.customer_history (
      company_id, branch_id, customer_id, contract_id, action, changes,
      new_contract_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.customer_id, new.id, 'contract_create',
      jsonb_build_object(
        'contract_number', new.contract_number,
        'contract_status', new.contract_status,
        'starts_at', new.starts_at,
        'ends_at', new.ends_at
      ),
      new.contract_status,
      new.created_by
    );
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_actor := new.updated_by;

    if old.deleted_at is null and new.deleted_at is not null then
      insert into public.customer_history (
        company_id, branch_id, customer_id, contract_id, action, changes,
        previous_contract_status, new_contract_status, created_by
      )
      values (
        new.company_id, new.branch_id, new.customer_id, new.id, 'contract_cancel',
        jsonb_build_object('deleted_at', new.deleted_at),
        old.contract_status, new.contract_status, v_actor
      );
      return new;
    end if;

    if old.contract_status is distinct from new.contract_status then
      if new.contract_status = 'renewed' then
        v_action := 'contract_renewal';
      elsif new.contract_status = 'cancelled' then
        v_action := 'contract_cancel';
      else
        v_action := 'contract_status_change';
      end if;
    end if;

    if old.contract_number is distinct from new.contract_number then
      v_changes := v_changes || jsonb_build_object('contract_number', jsonb_build_object('from', old.contract_number, 'to', new.contract_number));
    end if;
    if old.contract_status is distinct from new.contract_status then
      v_changes := v_changes || jsonb_build_object('contract_status', jsonb_build_object('from', old.contract_status, 'to', new.contract_status));
    end if;
    if old.ends_at is distinct from new.ends_at then
      v_changes := v_changes || jsonb_build_object('ends_at', jsonb_build_object('from', old.ends_at, 'to', new.ends_at));
    end if;
    if old.contracted_revenue is distinct from new.contracted_revenue then
      v_changes := v_changes || jsonb_build_object('contracted_revenue', jsonb_build_object('from', old.contracted_revenue, 'to', new.contracted_revenue));
    end if;

    if v_changes = '{}'::jsonb and v_action = 'update' then
      return new;
    end if;

    insert into public.customer_history (
      company_id, branch_id, customer_id, contract_id, action, changes,
      previous_contract_status, new_contract_status, created_by
    )
    values (
      new.company_id, new.branch_id, new.customer_id, new.id, v_action, v_changes,
      old.contract_status, new.contract_status, v_actor
    );
    return new;
  end if;

  return new;
end;
$$;

create trigger customer_contracts_log_history
  after insert or update on public.customer_contracts
  for each row
  execute function public.log_customer_contract_history();

-- ---------------------------------------------------------------------------
-- History trigger — document uploads
-- ---------------------------------------------------------------------------

create or replace function public.log_customer_document_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_history (
    company_id, branch_id, customer_id, contract_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.customer_id, new.contract_id, 'document_upload',
    jsonb_build_object(
      'document_type', new.document_type,
      'name', new.name,
      'file_url', new.file_url
    ),
    new.created_by
  );
  return new;
end;
$$;

create trigger customer_documents_log_history
  after insert on public.customer_documents
  for each row
  execute function public.log_customer_document_history();

-- ---------------------------------------------------------------------------
-- Sync contracted revenue from contract items
-- ---------------------------------------------------------------------------

create or replace function public.sync_customer_contract_revenue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contract_id uuid;
  v_total numeric(14, 2);
begin
  v_contract_id := coalesce(new.contract_id, old.contract_id);

  select coalesce(sum(coalesce(freight_value, 0)), 0)
  into v_total
  from public.customer_contract_items
  where contract_id = v_contract_id
    and deleted_at is null;

  update public.customer_contracts
  set contracted_revenue = v_total,
      updated_at = timezone('utc', now())
  where id = v_contract_id;

  return coalesce(new, old);
end;
$$;

create trigger customer_contract_items_sync_revenue
  after insert or update or delete on public.customer_contract_items
  for each row
  execute function public.sync_customer_contract_revenue();

-- ---------------------------------------------------------------------------
-- get_customer_stats RPC
-- ---------------------------------------------------------------------------

create or replace function public.get_customer_stats(p_company_id uuid)
returns json
language sql
stable
security invoker
set search_path = public
as $$
  with customers_base as (
    select id, customer_status
    from public.customers
    where company_id = p_company_id
      and deleted_at is null
  ),
  contracts_base as (
    select
      cc.id,
      cc.customer_id,
      cc.contract_number,
      cc.contract_status,
      cc.contracted_revenue,
      cc.ends_at,
      c.legal_name as customer_name
    from public.customer_contracts cc
    join public.customers c on c.id = cc.customer_id and c.deleted_at is null
    where cc.company_id = p_company_id
      and cc.deleted_at is null
  ),
  expiring_threshold as (
    select current_date + interval '30 days' as limit_date
  )
  select json_build_object(
    'total', (select count(*)::int from customers_base),
    'active', (select count(*)::int from customers_base where customer_status = 'active'),
    'inactive', (select count(*)::int from customers_base where customer_status = 'inactive'),
    'active_contracts', (
      select count(*)::int from contracts_base where contract_status = 'active'
    ),
    'expiring_contracts', (
      select count(*)::int
      from contracts_base cb, expiring_threshold et
      where cb.contract_status = 'active'
        and cb.ends_at is not null
        and cb.ends_at >= current_date
        and cb.ends_at <= et.limit_date
    ),
    'expired_contracts', (
      select count(*)::int
      from contracts_base
      where contract_status in ('expired', 'cancelled')
        or (ends_at is not null and ends_at < current_date and contract_status = 'active')
    ),
    'contracted_revenue', (
      select coalesce(sum(contracted_revenue), 0)::numeric
      from contracts_base
      where contract_status = 'active'
    ),
    'top_customers', coalesce(
      (
        select json_agg(row_to_json(t) order by t.total_revenue desc)
        from (
          select
            cb.customer_id,
            cb.customer_name,
            sum(cb.contracted_revenue)::numeric as total_revenue,
            count(*)::int as contract_count
          from contracts_base cb
          where cb.contract_status = 'active'
          group by cb.customer_id, cb.customer_name
          order by sum(cb.contracted_revenue) desc
          limit 5
        ) t
      ),
      '[]'::json
    ),
    'top_contracts', coalesce(
      (
        select json_agg(row_to_json(t) order by t.contracted_revenue desc)
        from (
          select
            id as contract_id,
            contract_number,
            customer_id,
            customer_name,
            contracted_revenue,
            ends_at
          from contracts_base
          where contract_status = 'active'
          order by contracted_revenue desc
          limit 5
        ) t
      ),
      '[]'::json
    )
  );
$$;

comment on function public.get_customer_stats(uuid) is
  'Aggregated customer and contract statistics for dashboard KPIs';

grant select, insert, update, delete on public.customers to authenticated;
grant select, insert, update, delete on public.customer_addresses to authenticated;
grant select, insert, update, delete on public.customer_contacts to authenticated;
grant select, insert, update, delete on public.customer_contracts to authenticated;
grant select, insert, update, delete on public.customer_contract_items to authenticated;
grant select, insert, update, delete on public.customer_documents to authenticated;
grant select, insert on public.customer_history to authenticated;
grant execute on function public.get_customer_stats(uuid) to authenticated;
