-- FleetControl — Movimentos de títulos a receber
-- Registro somente de inclusão: recebimentos, estornos e ajustes rastreáveis.
-- A escrita acontece apenas pelas funções da migration 107; authenticated só lê.

create table public.financial_entry_movements (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies (id) on delete restrict,
  financial_entry_id    uuid not null,
  kind                  text not null,
  amount                numeric(14, 2) not null,
  movement_date         date not null,
  payment_method        text,
  notes                 text,
  reason                text,
  reverses_movement_id  uuid references public.financial_entry_movements (id) on delete restrict,
  idempotency_key       text not null,
  created_at            timestamptz not null default timezone('utc', now()),
  created_by            uuid references public.profiles (id) on delete set null,

  constraint financial_entry_movements_entry_fkey
    foreign key (company_id, financial_entry_id)
    references public.financial_entries (company_id, id)
    on delete cascade,
  constraint financial_entry_movements_kind_check
    check (kind in ('receipt', 'receipt_reversal', 'adjustment')),
  constraint financial_entry_movements_amount_check
    check (
      (kind = 'adjustment' and amount <> 0)
      or (kind in ('receipt', 'receipt_reversal') and amount > 0)
    ),
  constraint financial_entry_movements_payment_method_check
    check (
      payment_method is null
      or payment_method in ('pix', 'boleto', 'transfer', 'cash', 'card', 'other')
    ),
  constraint financial_entry_movements_reversal_target_check
    check ((kind = 'receipt_reversal') = (reverses_movement_id is not null)),
  constraint financial_entry_movements_reason_check
    check (
      kind = 'receipt'
      or length(trim(coalesce(reason, ''))) > 0
    ),
  constraint financial_entry_movements_key_not_empty
    check (length(trim(idempotency_key)) > 0)
);

comment on table public.financial_entry_movements is
  'Recebimentos, estornos e ajustes de títulos a receber. Somente inclusão';

create unique index idx_financial_entry_movements_idempotency
  on public.financial_entry_movements (company_id, idempotency_key);

-- Um recebimento só pode ser estornado uma vez.
create unique index idx_financial_entry_movements_single_reversal
  on public.financial_entry_movements (reverses_movement_id)
  where reverses_movement_id is not null;

create index idx_financial_entry_movements_entry
  on public.financial_entry_movements (company_id, financial_entry_id, movement_date);

create index idx_financial_entry_movements_company_date
  on public.financial_entry_movements (company_id, movement_date desc);

alter table public.financial_entry_movements enable row level security;

create policy financial_entry_movements_select_authorized
  on public.financial_entry_movements
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

-- O Supabase concede tudo por padrão a tabelas novas (pg_default_acl).
revoke all on table public.financial_entry_movements
  from public, anon, authenticated, service_role;

grant select on public.financial_entry_movements to authenticated;
grant select on public.financial_entry_movements to service_role;

-- Movimentos não mudam nem somem por comando direto. A exclusão em cascata do
-- título (ferramentas de reset) acontece dentro de um gatilho de FK, com
-- profundidade maior que 1, e continua permitida.
create or replace function public.prevent_financial_movement_change()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if pg_trigger_depth() = 1 then
    raise exception 'Movimentos financeiros não podem ser alterados nem excluídos. Registre um estorno.'
      using errcode = 'P0001';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger financial_entry_movements_append_only
  before update or delete on public.financial_entry_movements
  for each row
  execute function public.prevent_financial_movement_change();
