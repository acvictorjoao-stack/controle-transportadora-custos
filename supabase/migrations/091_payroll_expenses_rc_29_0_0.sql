-- RC 29.0 — Despesas de Pessoal (Folha)
-- Adiciona cadastro de cargos, cadastro de colaboradores (não-motoristas) e
-- despesas de folha. Motoristas continuam sendo cadastrados apenas em drivers:
-- a despesa aponta para employee_id OU driver_id (XOR), sem duplicar cadastro.
--
-- Reaproveita, sem alterar: categoria financeira 'salarios', centros de custo
-- (RH/ADMINISTRATIVO/OPERACIONAL) e as permissões financeiro:* para RLS.
-- Nenhuma permissão nova, nenhum papel alterado.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.payroll_expense_type as enum (
  'salario',
  'hora_extra',
  'adicional',
  'beneficios',
  'vale_alimentacao',
  'vale_transporte',
  'encargos',
  'ferias',
  'decimo_terceiro',
  'rescisao',
  'outros'
);

-- Todas as referências de folha são tenant-scoped. As tabelas legadas usam
-- UUID como chave primária, portanto criamos chaves únicas compostas para que
-- as FKs abaixo validem também o company_id.
alter table public.branches
  add constraint branches_company_id_id_key unique (company_id, id);

alter table public.drivers
  add constraint drivers_company_id_id_key unique (company_id, id);

alter table public.cost_centers
  add constraint cost_centers_company_id_id_key unique (company_id, id);

-- Toda FK composta desta migration usa RESTRICT: company_id é NOT NULL e
-- SET NULL tentaria anular também a coluna de empresa. Filiais, cargos e
-- centros de custo são desativados por soft delete, então o hard delete só é
-- bloqueado quando ainda existe vínculo real.
alter table public.drivers
  drop constraint if exists drivers_branch_id_fkey;

alter table public.drivers
  add constraint drivers_branch_company_fkey
  foreign key (company_id, branch_id)
  references public.branches (company_id, id)
  on delete restrict;

create type public.payroll_expense_status as enum (
  'pending',
  'paid',
  'cancelled'
);

create type public.employee_contract_type as enum (
  'clt',
  'pj',
  'autonomo',
  'estagio',
  'temporario',
  'outros'
);

-- ---------------------------------------------------------------------------
-- positions — cargos por empresa (customizáveis)
-- ---------------------------------------------------------------------------

create table public.positions (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete restrict,
  code        text not null,
  name        text not null,
  description text,
  is_system   boolean not null default false,
  status      public.entity_status not null default 'active',
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default timezone('utc', now()),
  updated_at  timestamptz not null default timezone('utc', now()),
  deleted_at  timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  constraint positions_code_not_empty check (length(trim(code)) > 0),
  constraint positions_name_not_empty check (length(trim(name)) > 0),
  constraint positions_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint positions_company_id_id_key unique (company_id, id)
);

create unique index idx_positions_company_code_active
  on public.positions (company_id, upper(code))
  where deleted_at is null;

create index idx_positions_company_active
  on public.positions (company_id)
  where deleted_at is null;

create trigger positions_set_updated_at
  before update on public.positions
  for each row
  execute function public.set_updated_at();

alter table public.positions enable row level security;

comment on table public.positions is
  'Cargos por empresa (MOTORISTA, SUPERVISOR, GERENTE, …, customizáveis)';

comment on column public.positions.is_system is
  'Cargos semeados pelo sistema não podem ser excluídos';

-- ---------------------------------------------------------------------------
-- employees — colaboradores sem cadastro operacional próprio
-- Motoristas NÃO são replicados aqui: permanecem apenas em public.drivers.
-- ---------------------------------------------------------------------------

create table public.employees (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies (id) on delete restrict,
  branch_id           uuid,
  position_id         uuid,
  cost_center_id      uuid,
  name                text not null,
  cpf                 text,
  registration_number text,
  email               text,
  phone               text,
  contract_type       public.employee_contract_type,
  hired_at            date,
  terminated_at       date,
  notes               text,
  status              public.entity_status not null default 'active',
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  deleted_at          timestamptz,
  created_by          uuid references public.profiles (id) on delete set null,
  updated_by          uuid references public.profiles (id) on delete set null,
  constraint employees_name_not_empty check (length(trim(name)) > 0),
  constraint employees_metadata_is_object check (jsonb_typeof(metadata) = 'object'),
  constraint employees_termination_after_hire
    check (terminated_at is null or hired_at is null or terminated_at >= hired_at),
  constraint employees_branch_company_fkey
    foreign key (company_id, branch_id)
    references public.branches (company_id, id)
    on delete restrict,
  constraint employees_position_company_fkey
    foreign key (company_id, position_id)
    references public.positions (company_id, id)
    on delete restrict,
  constraint employees_cost_center_company_fkey
    foreign key (company_id, cost_center_id)
    references public.cost_centers (company_id, id)
    on delete restrict,
  constraint employees_company_id_id_key unique (company_id, id)
);

create unique index idx_employees_company_cpf_active
  on public.employees (company_id, cpf)
  where deleted_at is null and cpf is not null;

create unique index idx_employees_company_registration_active
  on public.employees (company_id, upper(trim(registration_number)))
  where deleted_at is null and registration_number is not null;

create index idx_employees_company_active
  on public.employees (company_id)
  where deleted_at is null;

create index idx_employees_company_position
  on public.employees (company_id, position_id)
  where deleted_at is null;

create trigger employees_set_updated_at
  before update on public.employees
  for each row
  execute function public.set_updated_at();

alter table public.employees enable row level security;

comment on table public.employees is
  'Colaboradores administrativos/gestão. Motoristas permanecem em drivers (sem duplicidade)';

-- ---------------------------------------------------------------------------
-- payroll_expenses — despesas de pessoal / folha
-- ---------------------------------------------------------------------------

create table public.payroll_expenses (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid not null references public.companies (id) on delete restrict,
  branch_id      uuid,
  employee_id    uuid,
  driver_id      uuid,
  position_id    uuid,
  cost_center_id uuid not null,
  competence     date not null,
  expense_type   public.payroll_expense_type not null,
  expense_status public.payroll_expense_status not null default 'pending',
  amount         numeric(14, 2) not null,
  payment_method text,
  due_date       date,
  paid_at        date,
  notes          text,
  metadata       jsonb not null default '{}'::jsonb,
  status         public.entity_status not null default 'active',
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),
  deleted_at     timestamptz,
  created_by     uuid references public.profiles (id) on delete set null,
  updated_by     uuid references public.profiles (id) on delete set null,

  -- Exatamente uma pessoa: colaborador OU motorista já cadastrado.
  constraint payroll_expenses_person_xor
    check ((employee_id is not null) <> (driver_id is not null)),
  constraint payroll_expenses_amount_positive check (amount > 0),
  constraint payroll_expenses_competence_first_day
    check (extract(day from competence) = 1),
  constraint payroll_expenses_pending_requires_due_date
    check (expense_status <> 'pending' or due_date is not null),
  constraint payroll_expenses_paid_requires_paid_at
    check (expense_status <> 'paid' or paid_at is not null),
  constraint payroll_expenses_payment_method_allowed
    check (
      payment_method is null
      or payment_method in (
        'pix', 'transferencia', 'deposito', 'dinheiro', 'cheque', 'outros'
      )
    ),
  constraint payroll_expenses_metadata_is_object
    check (jsonb_typeof(metadata) = 'object'),
  constraint payroll_expenses_branch_company_fkey
    foreign key (company_id, branch_id)
    references public.branches (company_id, id)
    on delete restrict,
  constraint payroll_expenses_employee_company_fkey
    foreign key (company_id, employee_id)
    references public.employees (company_id, id)
    on delete restrict,
  constraint payroll_expenses_driver_company_fkey
    foreign key (company_id, driver_id)
    references public.drivers (company_id, id)
    on delete restrict,
  constraint payroll_expenses_position_company_fkey
    foreign key (company_id, position_id)
    references public.positions (company_id, id)
    on delete restrict,
  constraint payroll_expenses_cost_center_company_fkey
    foreign key (company_id, cost_center_id)
    references public.cost_centers (company_id, id)
    on delete restrict
);

create index idx_payroll_expenses_company_active
  on public.payroll_expenses (company_id)
  where deleted_at is null;

create index idx_payroll_expenses_company_competence
  on public.payroll_expenses (company_id, competence)
  where deleted_at is null;

create index idx_payroll_expenses_company_status
  on public.payroll_expenses (company_id, expense_status)
  where deleted_at is null;

create index idx_payroll_expenses_company_employee
  on public.payroll_expenses (company_id, employee_id)
  where deleted_at is null and employee_id is not null;

create index idx_payroll_expenses_company_driver
  on public.payroll_expenses (company_id, driver_id)
  where deleted_at is null and driver_id is not null;

create index idx_payroll_expenses_company_cost_center
  on public.payroll_expenses (company_id, cost_center_id)
  where deleted_at is null;

-- Suporta a checagem de duplicidade (mesma pessoa + competência + tipo).
create index idx_payroll_expenses_duplicate_lookup
  on public.payroll_expenses (company_id, competence, expense_type)
  where deleted_at is null;

create trigger payroll_expenses_set_updated_at
  before update on public.payroll_expenses
  for each row
  execute function public.set_updated_at();

alter table public.payroll_expenses enable row level security;

comment on table public.payroll_expenses is
  'Despesas de pessoal / folha. Gera lançamento em financial_entries com source_module = payroll';

comment on column public.payroll_expenses.competence is
  'Competência normalizada no primeiro dia do mês';

comment on column public.payroll_expenses.expense_status is
  'pending exige vencimento (vai para Contas a Pagar); paid exige data de pagamento';

-- ---------------------------------------------------------------------------
-- payroll_people — visão unificada de pessoas elegíveis à folha
-- security_invoker mantém o RLS das tabelas de origem.
-- ---------------------------------------------------------------------------

create view public.payroll_people with (security_invoker = true) as
select
  d.id                                       as id,
  'driver'::text                             as person_kind,
  d.company_id                               as company_id,
  d.name                                     as name,
  d.cpf                                      as cpf,
  null::uuid                                 as position_id,
  null::uuid                                 as cost_center_id,
  d.branch_id                                as branch_id,
  (d.status = 'active')                      as active
from public.drivers d
where d.deleted_at is null
union all
select
  e.id                                       as id,
  'employee'::text                           as person_kind,
  e.company_id                               as company_id,
  e.name                                     as name,
  e.cpf                                      as cpf,
  e.position_id                              as position_id,
  e.cost_center_id                           as cost_center_id,
  e.branch_id                                as branch_id,
  (e.status = 'active')                      as active
from public.employees e
where e.deleted_at is null;

comment on view public.payroll_people is
  'Motoristas (drivers) + colaboradores (employees) unificados para filtros e relatórios de folha';

-- ---------------------------------------------------------------------------
-- RLS — reutiliza financeiro:* (mesmo padrão de cost_centers, sem RBAC novo)
-- ---------------------------------------------------------------------------

create policy positions_select_authorized
  on public.positions
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy positions_insert_authorized
  on public.positions
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:create')
    or public.is_company_super_admin(company_id)
  );

create policy positions_update_authorized
  on public.positions
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

-- Cargos semeados pelo sistema não são excluíveis por ninguém: nem com
-- financeiro:delete, nem via Super Admin / contexto Master.
create policy positions_delete_authorized
  on public.positions
  for delete
  to authenticated
  using (
    is_system = false
    and (
      public.has_company_permission(company_id, 'financeiro:delete')
      or public.is_company_super_admin(company_id)
    )
  );

create policy employees_select_authorized
  on public.employees
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy employees_insert_authorized
  on public.employees
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:create')
    or public.is_company_super_admin(company_id)
  );

create policy employees_update_authorized
  on public.employees
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

create policy employees_delete_authorized
  on public.employees
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:delete')
    or public.is_company_super_admin(company_id)
  );

create policy payroll_expenses_select_authorized
  on public.payroll_expenses
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy payroll_expenses_insert_authorized
  on public.payroll_expenses
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:create')
    or public.is_company_super_admin(company_id)
  );

create policy payroll_expenses_update_authorized
  on public.payroll_expenses
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

-- payroll_expenses não tem policy de DELETE: a exclusão é lógica
-- (deleted_at + status archived) com estorno do lançamento financeiro, para
-- preservar o histórico. financeiro:delete continua valendo para essa operação,
-- que é um UPDATE.

-- Tabelas criadas após 014 não herdam privileges — GRANTs explícitos.
grant select, insert, update, delete on public.positions to authenticated;
grant select, insert, update, delete on public.employees to authenticated;
grant select, insert, update on public.payroll_expenses to authenticated;
grant select on public.payroll_people to authenticated;

grant all on public.positions to service_role;
grant all on public.employees to service_role;
grant all on public.payroll_expenses to service_role;

-- ---------------------------------------------------------------------------
-- Hard delete de folha — bloqueado por padrão, inclusive para service_role
-- Mesmo padrão do storage.protect_delete usado pelo Supabase: a operação
-- administrativa legítima continua possível, mas precisa ser explícita.
-- TRUNCATE não dispara este trigger, então reset_demo_data.sql segue válido.
-- ---------------------------------------------------------------------------

create or replace function public.prevent_payroll_expense_hard_delete()
returns trigger
language plpgsql
as $$
begin
  if coalesce(
    current_setting('app.allow_payroll_hard_delete', true),
    'off'
  ) = 'on' then
    return old;
  end if;

  raise exception
    'payroll_expenses não permite exclusão física: use exclusão lógica com estorno'
    using errcode = '42501';
end;
$$;

comment on function public.prevent_payroll_expense_hard_delete() is
  'Bloqueia DELETE físico em payroll_expenses; libere com set_config(''app.allow_payroll_hard_delete'', ''on'', true)';

create trigger payroll_expenses_prevent_hard_delete
  before delete on public.payroll_expenses
  for each row
  execute function public.prevent_payroll_expense_hard_delete();

-- ---------------------------------------------------------------------------
-- Seed de cargos padrão por empresa
-- ---------------------------------------------------------------------------

create or replace function public.seed_positions_for_company(
  p_company_id uuid,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- SECURITY DEFINER não pode afrouxar a autorização: exige a mesma permissão
  -- de escrita da policy de insert de positions. Master só passa quando está
  -- atuando na empresa (portal_acting_companies) — sem contexto, nega.
  -- auth.uid() nulo = contexto de sistema (migration / service_role).
  if auth.uid() is not null
    and not (
      public.has_company_permission(p_company_id, 'financeiro:create')
      or public.is_company_super_admin(p_company_id)
    ) then
    raise exception 'not authorized to seed positions for this company'
      using errcode = '42501';
  end if;

  insert into public.positions (
    company_id, code, name, description, is_system, created_by, updated_by
  )
  select
    p_company_id,
    v.code,
    v.name,
    v.description,
    true,
    p_created_by,
    p_created_by
  from (
    values
      ('MOTORISTA', 'Motorista', 'Condutor da frota'),
      ('SUPERVISOR', 'Supervisor', 'Supervisão de equipes e operação'),
      ('GERENTE', 'Gerente', 'Gestão de área'),
      ('COORDENADOR', 'Coordenador', 'Coordenação de equipes e processos'),
      ('ANALISTA', 'Analista', 'Analista de área'),
      ('ADMINISTRATIVO', 'Administrativo', 'Apoio administrativo'),
      ('OUTROS', 'Outros', 'Demais cargos')
  ) as v(code, name, description)
  -- NOT EXISTS mantém intactos os cargos já cadastrados (inclusive os
  -- renomeados pela empresa); ON CONFLICT fecha a janela de corrida entre duas
  -- chamadas simultâneas para a mesma empresa.
  where not exists (
    select 1
    from public.positions p
    where p.company_id = p_company_id
      and upper(p.code) = v.code
      and p.deleted_at is null
  )
  on conflict (company_id, upper(code)) where deleted_at is null
  do nothing;
end;
$$;

comment on function public.seed_positions_for_company(uuid, uuid) is
  'Semeia cargos padrão da empresa (exige financeiro:create ou Super Admin quando chamado por usuário autenticado)';

-- Funções novas nascem com EXECUTE para PUBLIC: sem o revoke, anon chamaria a
-- função em contexto de sistema (auth.uid() nulo) e semearia qualquer empresa.
revoke all on function public.seed_positions_for_company(uuid, uuid) from public;
grant execute on function public.seed_positions_for_company(uuid, uuid) to authenticated, service_role;

do $$
declare
  v_company record;
begin
  for v_company in
    select id from public.companies where deleted_at is null
  loop
    perform public.seed_positions_for_company(v_company.id, null);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Idempotência do lançamento financeiro da folha
-- ---------------------------------------------------------------------------

-- Estorno é sempre um par: só reversal carrega reversed_entry_id e todo
-- reversal aponta para o lançamento original. NOT VALID não varre as linhas
-- legadas de financial_entries (tabela de 062), mas passa a validar todo
-- insert/update — inclusive os estornos gerados pela folha.
alter table public.financial_entries
  drop constraint if exists financial_entries_reversal_requires_original;

alter table public.financial_entries
  add constraint financial_entries_reversal_requires_original
  check ((entry_type = 'reversal') = (reversed_entry_id is not null))
  not valid;

comment on constraint financial_entries_reversal_requires_original
  on public.financial_entries is
  'Reversal exige reversed_entry_id; nenhum outro tipo pode preencher a coluna';

-- Sem source_id + parcela não existe chave determinística para a origem da
-- folha, e o índice único abaixo deixaria passar duplicidade por NULL.
-- Reversals de folha ficam de fora: eles não são origem e não têm parcela.
alter table public.financial_entries
  drop constraint if exists financial_entries_payroll_origin_key;

alter table public.financial_entries
  add constraint financial_entries_payroll_origin_key
  check (
    source_module is distinct from 'payroll'
    or entry_type = 'reversal'
    or (source_id is not null and installment_number is not null)
  );

comment on constraint financial_entries_payroll_origin_key
  on public.financial_entries is
  'Origem de folha exige chave determinística (source_id + installment_number)';

-- Uma única origem de folha por despesa + parcela. Linhas soft-deleted
-- continuam ocupando a chave: exclusão lógica não abre espaço para um segundo
-- lançamento da mesma despesa. Reversals ficam fora (não são origem) e o
-- original revertido também, porque reativar uma despesa cancelada precisa
-- lançar de novo — o estorno anterior permanece amarrado ao original.
create unique index idx_financial_entries_payroll_source_active
  on public.financial_entries (company_id, source_id, installment_number)
  where source_module = 'payroll'
    and entry_type <> 'reversal'
    and entry_status <> 'reversed';

-- No máximo um estorno por lançamento original, independente de soft delete.
create unique index idx_financial_entries_single_reversal
  on public.financial_entries (reversed_entry_id)
  where reversed_entry_id is not null;
