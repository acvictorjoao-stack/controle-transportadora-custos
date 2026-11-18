-- FleetControl — Fase 1, Etapa 2: despesa da viagem no financeiro
-- Não altera dados existentes.
--
-- Cada despesa da aba "Despesas" gera no máximo UM lançamento em
-- financial_entries (origem trip_expense, source_id = id da despesa, parcela 1;
-- o índice único da migration 109 garante isso). O lançamento nasce e muda só
-- por esta sincronização, na mesma transação da despesa: se ele falhar, a
-- despesa não é salva.
--
-- Inerte para o código antigo (decisão D10): só despesas com "quem pagou"
-- (paid_by) preenchido são integradas. Quem ainda não informa paid_by não gera
-- nenhum lançamento; as despesas antigas entram depois, pelo backfill (2B).
--
-- Tratamento por quem pagou (decisão D8):
--   empresa (conta, cartão, tag, dinheiro, não informado) -> pago na data
--   empresa a prazo (fornecedor)                          -> pendente, com vencimento
--   motorista com dinheiro próprio / agregado             -> pendente (reembolso):
--     o reembolso baixa ESTE lançamento, sem segundo custo
--   motorista com adiantamento                            -> pago, sem nova saída de
--     caixa (o dinheiro saiu no adiantamento, que nunca é custo da DRE)
--   terceiro (cliente, embarcador)                        -> sem lançamento (D13)
-- Despesa do tipo antigo "advance" nunca vira custo (D14).
--
-- auth.uid() nulo = service role, a mesma convenção das migrations 098, 099 e 107.
-- Idempotente: pode ser reaplicada (por exemplo, por um db push sem histórico)
-- sem erro e sem efeito colateral.

-- ---------------------------------------------------------------------------
-- Colunas de "quem pagou"
-- ---------------------------------------------------------------------------

alter table public.trip_expenses
  add column if not exists paid_by text,
  add column if not exists payment_method text,
  add column if not exists due_date date;

comment on column public.trip_expenses.paid_by is
  'Quem pagou: company, driver, aggregate ou third_party. Nulo = não informado (não integra ao financeiro).';
comment on column public.trip_expenses.payment_method is
  'Instrumento: bank_account, corporate_card, toll_tag, cash, not_informed, supplier_credit, own_money ou driver_advance.';
comment on column public.trip_expenses.due_date is
  'Vencimento quando a despesa fica a pagar (compra a prazo).';

alter table public.trip_expenses
  drop constraint if exists trip_expenses_paid_by_check;

alter table public.trip_expenses
  add constraint trip_expenses_paid_by_check
  check (paid_by is null or paid_by in ('company', 'driver', 'aggregate', 'third_party'));

alter table public.trip_expenses
  drop constraint if exists trip_expenses_payment_method_check;

alter table public.trip_expenses
  add constraint trip_expenses_payment_method_check
  check (
    payment_method is null
    or payment_method in (
      'bank_account', 'corporate_card', 'toll_tag', 'cash', 'not_informed',
      'supplier_credit', 'own_money', 'driver_advance'
    )
  );

-- Combinações válidas de quem pagou e instrumento.
alter table public.trip_expenses
  drop constraint if exists trip_expenses_payment_combination_check;

alter table public.trip_expenses
  add constraint trip_expenses_payment_combination_check
  check (
    (paid_by is null and payment_method is null)
    or (paid_by = 'third_party' and payment_method is null)
    or (paid_by = 'company' and payment_method in (
      'bank_account', 'corporate_card', 'toll_tag', 'cash', 'not_informed', 'supplier_credit'
    ))
    or (paid_by = 'driver' and payment_method in ('own_money', 'driver_advance'))
    or (paid_by = 'aggregate' and payment_method = 'own_money')
  );

alter table public.trip_expenses
  drop constraint if exists trip_expenses_supplier_credit_requires_due_date;

alter table public.trip_expenses
  add constraint trip_expenses_supplier_credit_requires_due_date
  check (payment_method is distinct from 'supplier_credit' or due_date is not null);

-- ---------------------------------------------------------------------------
-- Regras puras
-- ---------------------------------------------------------------------------

-- paid: o lançamento nasce pago (a saída foi a própria despesa).
-- paid_by_advance: nasce pago, sem nova saída (consumo de adiantamento).
-- payable: nasce pendente (reembolso ou compra a prazo).
-- none: sem lançamento (terceiro ou não informado).
create or replace function public.trip_expense_financial_treatment(
  p_paid_by text,
  p_payment_method text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_paid_by = 'company' and p_payment_method = 'supplier_credit' then 'payable'
    when p_paid_by = 'company' then 'paid'
    when p_paid_by = 'driver' and p_payment_method = 'driver_advance' then 'paid_by_advance'
    when p_paid_by in ('driver', 'aggregate') then 'payable'
    else 'none'
  end;
$$;

create or replace function public.trip_expense_category_slug(p_expense_type public.trip_expense_type)
returns public.financial_category_slug
language sql
immutable
set search_path = public
as $$
  select (case p_expense_type::text
    when 'toll' then 'pedagio'
    when 'food' then 'alimentacao'
    when 'lodging' then 'hospedagem'
    when 'fine' then 'multas'
    when 'maintenance' then 'manutencao'
    when 'tire_shop' then 'pneus'
    else 'outros'
  end)::public.financial_category_slug;
$$;

create or replace function public.trip_expense_type_label(p_expense_type public.trip_expense_type)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_expense_type::text
    when 'toll' then 'Pedágio'
    when 'food' then 'Alimentação'
    when 'lodging' then 'Hospedagem'
    when 'fine' then 'Multa'
    when 'maintenance' then 'Manutenção'
    when 'tire_shop' then 'Borracharia'
    when 'parking' then 'Estacionamento'
    when 'ferry' then 'Balsa'
    when 'wash' then 'Lavagem'
    when 'advance' then 'Adiantamento'
    else 'Outros'
  end;
$$;

-- Reset de empresa (RPCs 103 e 104): define estas GUCs na própria sessão.
-- PostgREST não consegue defini-las. Vale só para DELETE.
create or replace function public.request_is_hml_company_reset()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_setting('app.allow_hml_company_reset', true) = 'HML_RESET_COMPANY_BUSINESS'
    and current_setting('app.hml_expected_project_ref', true) = 'aobfjjaucdrwybebosxm';
$$;

-- ---------------------------------------------------------------------------
-- Encerramento do lançamento (exclusão da despesa, terceiro, adiantamento)
-- ---------------------------------------------------------------------------
-- Pendente sem pagamento -> cancelado. Pago na origem -> estornado: o original
-- fica "reversed" e um lançamento de estorno é gravado (histórico preservado).
-- Com movimento de caixa ou reembolso já pago pelo Financeiro -> recusado: o
-- pagamento precisa ser estornado antes.

create or replace function public.close_trip_expense_entry(p_entry_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.financial_entries%rowtype;
begin
  select * into v_entry
  from public.financial_entries
  where id = p_entry_id
  for update;

  if not found or v_entry.entry_status in ('cancelled', 'reversed') then
    return;
  end if;

  if exists (
    select 1
    from public.financial_entry_movements m
    where m.financial_entry_id = v_entry.id
  ) then
    raise exception 'Esta despesa tem movimento de caixa. Estorne o pagamento no Financeiro antes.'
      using errcode = 'P0001';
  end if;

  if v_entry.metadata ->> 'treatment' = 'payable'
     and (v_entry.entry_status = 'paid' or v_entry.paid_amount is not null) then
    raise exception 'O pagamento desta despesa já foi registrado no Financeiro. Estorne o pagamento antes.'
      using errcode = 'P0001';
  end if;

  perform set_config('fleetcontrol.trip_expense_internal', 'on', true);

  if v_entry.entry_status = 'paid' then
    insert into public.financial_entries (
      company_id, branch_id, vehicle_id, driver_id, trip_id,
      customer_id, customer_contract_id, category_id, cost_center_id,
      entry_type, entry_status, description, reference_number,
      amount, currency, entry_date,
      source_module, source_id, is_system_generated, reversed_entry_id,
      metadata, created_by, updated_by
    )
    values (
      v_entry.company_id, v_entry.branch_id, v_entry.vehicle_id, v_entry.driver_id, v_entry.trip_id,
      v_entry.customer_id, v_entry.customer_contract_id, v_entry.category_id, v_entry.cost_center_id,
      'reversal', 'paid', 'Estorno — ' || coalesce(v_entry.description, 'despesa de viagem'),
      v_entry.reference_number,
      v_entry.amount, v_entry.currency, (timezone('America/Sao_Paulo', now()))::date,
      'trip_expense', v_entry.source_id, true, v_entry.id,
      jsonb_build_object('reason', 'trip_expense_closed'), p_actor, p_actor
    );

    update public.financial_entries
    set entry_status = 'reversed', updated_by = p_actor
    where id = v_entry.id;
  else
    update public.financial_entries
    set entry_status = 'cancelled', updated_by = p_actor
    where id = v_entry.id;
  end if;

  perform set_config('fleetcontrol.trip_expense_internal', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Sincronização despesa -> lançamento
-- ---------------------------------------------------------------------------

create or replace function public.sync_trip_expense_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.financial_entries%rowtype;
  v_trip_number text;
  v_trip_branch uuid;
  v_vehicle_id uuid;
  v_driver_id uuid;
  v_customer_id uuid;
  v_customer_contract_id uuid;
  v_treatment text;
  v_post boolean;
  v_actor uuid := coalesce(auth.uid(), new.updated_by, new.created_by);
  v_has_movements boolean := false;
  v_settled boolean := false;
  v_keep_settlement boolean := false;
  v_category_id uuid;
  v_cost_center_id uuid;
  v_status public.financial_entry_status;
  v_paid_at timestamptz;
  v_paid_amount numeric(14, 2);
  v_due date;
  v_description text;
  v_metadata jsonb;
  v_batch text := nullif(current_setting('fleetcontrol.trip_expense_batch', true), '');
begin
  if tg_op = 'UPDATE' then
    if new.company_id is distinct from old.company_id then
      raise exception 'Despesa de viagem não pode mudar de empresa.' using errcode = '42501';
    end if;

    if old.paid_by is not null and new.paid_by is null then
      raise exception 'Informe quem pagou: esta despesa já está integrada ao financeiro.'
        using errcode = 'P0001';
    end if;
  end if;

  select fe.* into v_entry
  from public.financial_entries fe
  where fe.company_id = new.company_id
    and fe.source_module = 'trip_expense'
    and fe.source_id = new.id
    and fe.entry_type = 'expense'
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
  order by fe.created_at
  limit 1
  for update;

  -- D10: sem "quem pagou" e sem lançamento, nada a fazer (código antigo).
  if new.paid_by is null and v_entry.id is null then
    return new;
  end if;

  v_treatment := public.trip_expense_financial_treatment(new.paid_by, new.payment_method);
  v_post := new.deleted_at is null
    and new.expense_type <> 'advance'
    and v_treatment <> 'none';

  if not v_post then
    if v_entry.id is not null then
      perform public.close_trip_expense_entry(v_entry.id, v_actor);
    end if;
    return new;
  end if;

  select t.trip_number, t.branch_id, t.vehicle_id, t.driver_id, t.customer_id, t.customer_contract_id
  into v_trip_number, v_trip_branch, v_vehicle_id, v_driver_id, v_customer_id, v_customer_contract_id
  from public.trips t
  where t.id = new.trip_id
    and t.company_id = new.company_id;

  if not found then
    raise exception 'Viagem não pertence a esta empresa.' using errcode = '42501';
  end if;

  select fc.id into v_category_id
  from public.financial_categories fc
  where fc.company_id = new.company_id
    and fc.slug = public.trip_expense_category_slug(new.expense_type)
    and fc.deleted_at is null
  limit 1;

  if v_category_id is null then
    select fc.id into v_category_id
    from public.financial_categories fc
    where fc.company_id = new.company_id
      and fc.slug = 'outros'
      and fc.deleted_at is null
    limit 1;
  end if;

  select cc.id into v_cost_center_id
  from public.cost_centers cc
  where cc.company_id = new.company_id
    and cc.code = 'OPERACIONAL'
    and cc.deleted_at is null
  limit 1;

  if v_treatment = 'payable' then
    v_status := 'pending';
    v_paid_at := null;
    v_paid_amount := null;
    v_due := coalesce(new.due_date, new.expense_date);
  else
    v_status := 'paid';
    v_paid_at := (new.expense_date::timestamp + interval '12 hours') at time zone 'utc';
    v_paid_amount := new.amount;
    v_due := null;
  end if;

  v_description := format(
    'Despesa de viagem — %s — %s',
    public.trip_expense_type_label(new.expense_type),
    v_trip_number
  ) || coalesce(' — ' || nullif(trim(new.description), ''), '');

  v_metadata := jsonb_build_object(
    'paid_by', new.paid_by,
    'payment_method', new.payment_method,
    'treatment', v_treatment,
    'expense_type', new.expense_type
  ) || case when v_batch is null then '{}'::jsonb else jsonb_build_object('backfill', v_batch) end;

  if v_entry.id is null then
    perform set_config('fleetcontrol.trip_expense_internal', 'on', true);

    insert into public.financial_entries (
      company_id, branch_id, vehicle_id, driver_id, trip_id,
      customer_id, customer_contract_id, category_id, cost_center_id,
      entry_type, entry_status, description, reference_number,
      amount, currency, entry_date, due_date, paid_at, paid_amount,
      source_module, source_id, is_system_generated,
      installment_number, installment_total, metadata, notes,
      created_by, updated_by
    )
    values (
      new.company_id, coalesce(new.branch_id, v_trip_branch), v_vehicle_id, v_driver_id, new.trip_id,
      v_customer_id, v_customer_contract_id, v_category_id, v_cost_center_id,
      'expense', v_status, v_description, v_trip_number,
      new.amount, coalesce(new.currency, 'BRL'), new.expense_date, v_due, v_paid_at, v_paid_amount,
      'trip_expense', new.id, true,
      1, 1, v_metadata, new.notes,
      v_actor, v_actor
    );

    perform set_config('fleetcontrol.trip_expense_internal', 'off', true);
    return new;
  end if;

  select exists (
    select 1
    from public.financial_entry_movements m
    where m.financial_entry_id = v_entry.id
  )
  into v_has_movements;

  v_settled := v_entry.metadata ->> 'treatment' = 'payable'
    and (v_entry.entry_status = 'paid' or v_entry.paid_amount is not null);

  if (v_has_movements or v_settled)
     and (
       new.amount is distinct from v_entry.amount
       or new.trip_id is distinct from v_entry.trip_id
       or v_treatment is distinct from v_entry.metadata ->> 'treatment'
       or new.paid_by is distinct from v_entry.metadata ->> 'paid_by'
       or new.payment_method is distinct from v_entry.metadata ->> 'payment_method'
     ) then
    raise exception 'O pagamento desta despesa já foi registrado no Financeiro. Estorne o pagamento antes de alterar valor, viagem ou quem pagou.'
      using errcode = 'P0001';
  end if;

  -- Reembolso ou compra a prazo já baixado: a baixa feita pelo Financeiro fica.
  v_keep_settlement := v_settled and v_treatment = 'payable';

  perform set_config('fleetcontrol.trip_expense_internal', 'on', true);

  update public.financial_entries fe
  set
    amount = new.amount,
    entry_date = new.expense_date,
    due_date = case when v_keep_settlement then fe.due_date else v_due end,
    entry_status = case when v_keep_settlement then fe.entry_status else v_status end,
    paid_at = case when v_keep_settlement then fe.paid_at else v_paid_at end,
    paid_amount = case when v_keep_settlement then fe.paid_amount else v_paid_amount end,
    category_id = v_category_id,
    cost_center_id = coalesce(fe.cost_center_id, v_cost_center_id),
    description = v_description,
    reference_number = v_trip_number,
    trip_id = new.trip_id,
    branch_id = coalesce(new.branch_id, v_trip_branch),
    vehicle_id = v_vehicle_id,
    driver_id = v_driver_id,
    customer_id = v_customer_id,
    customer_contract_id = v_customer_contract_id,
    notes = new.notes,
    metadata = fe.metadata || v_metadata,
    updated_by = v_actor
  where fe.id = v_entry.id
    and (
      fe.amount is distinct from new.amount
      or fe.entry_date is distinct from new.expense_date
      or fe.due_date is distinct from (case when v_keep_settlement then fe.due_date else v_due end)
      or fe.entry_status is distinct from (case when v_keep_settlement then fe.entry_status else v_status end)
      or fe.paid_at is distinct from (case when v_keep_settlement then fe.paid_at else v_paid_at end)
      or fe.paid_amount is distinct from (case when v_keep_settlement then fe.paid_amount else v_paid_amount end)
      or fe.category_id is distinct from v_category_id
      or fe.description is distinct from v_description
      or fe.trip_id is distinct from new.trip_id
      or fe.branch_id is distinct from coalesce(new.branch_id, v_trip_branch)
      or fe.vehicle_id is distinct from v_vehicle_id
      or fe.driver_id is distinct from v_driver_id
      or fe.customer_id is distinct from v_customer_id
      or fe.notes is distinct from new.notes
      or (fe.metadata || v_metadata) is distinct from fe.metadata
    );

  perform set_config('fleetcontrol.trip_expense_internal', 'off', true);
  return new;
end;
$$;

drop trigger if exists trip_expenses_sync_financial_entry on public.trip_expenses;

create trigger trip_expenses_sync_financial_entry
  after insert or update on public.trip_expenses
  for each row
  execute function public.sync_trip_expense_entry();

-- Exclusão física (cascata da viagem, limpeza manual): encerra o lançamento
-- como na exclusão lógica. O reset da empresa de teste apaga os lançamentos
-- antes e passa direto.
create or replace function public.close_trip_expense_entry_on_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry_id uuid;
begin
  if public.request_is_hml_company_reset() then
    return old;
  end if;

  select fe.id into v_entry_id
  from public.financial_entries fe
  where fe.company_id = old.company_id
    and fe.source_module = 'trip_expense'
    and fe.source_id = old.id
    and fe.entry_type = 'expense'
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
  limit 1;

  if v_entry_id is not null then
    perform public.close_trip_expense_entry(
      v_entry_id,
      coalesce(auth.uid(), old.updated_by, old.created_by)
    );
  end if;

  return old;
end;
$$;

drop trigger if exists trip_expenses_close_financial_entry on public.trip_expenses;

create trigger trip_expenses_close_financial_entry
  before delete on public.trip_expenses
  for each row
  execute function public.close_trip_expense_entry_on_delete();

-- ---------------------------------------------------------------------------
-- Proteção do lançamento integrado
-- ---------------------------------------------------------------------------
-- O lançamento de origem trip_expense só muda pela despesa. O Financeiro pode
-- apenas dar baixa (ou desfazer a baixa) de reembolso e compra a prazo, e
-- ajustar vencimento, descrição e observações.

create or replace function public.guard_trip_expense_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and public.request_is_hml_company_reset() then
    return old;
  end if;

  if coalesce(current_setting('fleetcontrol.trip_expense_internal', true), 'off') = 'on'
     or public.request_is_service_context() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.source_module = 'trip_expense' then
      raise exception 'Lançamentos de despesa de viagem nascem da própria despesa, na viagem.'
        using errcode = 'P0001';
    end if;

    if new.reversed_entry_id is not null and exists (
      select 1
      from public.financial_entries fe
      where fe.id = new.reversed_entry_id
        and fe.source_module = 'trip_expense'
    ) then
      raise exception 'Para estornar uma despesa de viagem, exclua ou altere a despesa na viagem.'
        using errcode = 'P0001';
    end if;

    return new;
  end if;

  if old.source_module is distinct from 'trip_expense' then
    if tg_op = 'UPDATE' and new.source_module = 'trip_expense' then
      raise exception 'Lançamentos de despesa de viagem nascem da própria despesa, na viagem.'
        using errcode = 'P0001';
    end if;
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Lançamento de despesa de viagem não pode ser excluído.' using errcode = 'P0001';
  end if;

  if old.entry_type = 'reversal' then
    raise exception 'O estorno de uma despesa de viagem não pode ser alterado.' using errcode = 'P0001';
  end if;

  if new.company_id is distinct from old.company_id
     or new.trip_id is distinct from old.trip_id
     or new.source_module is distinct from old.source_module
     or new.source_id is distinct from old.source_id
     or new.entry_type is distinct from old.entry_type
     or new.amount is distinct from old.amount
     or new.currency is distinct from old.currency
     or new.entry_date is distinct from old.entry_date
     or new.category_id is distinct from old.category_id
     or new.vehicle_id is distinct from old.vehicle_id
     or new.driver_id is distinct from old.driver_id
     or new.customer_id is distinct from old.customer_id
     or new.installment_number is distinct from old.installment_number
     or new.installment_total is distinct from old.installment_total
     or new.is_system_generated is distinct from old.is_system_generated
     or new.reversed_entry_id is distinct from old.reversed_entry_id
     or new.deleted_at is distinct from old.deleted_at
     or new.metadata ->> 'treatment' is distinct from old.metadata ->> 'treatment'
     or new.metadata ->> 'paid_by' is distinct from old.metadata ->> 'paid_by' then
    raise exception 'Altere a despesa na viagem: este lançamento é controlado por ela.'
      using errcode = 'P0001';
  end if;

  if new.entry_status is distinct from old.entry_status
     or new.paid_at is distinct from old.paid_at
     or new.paid_amount is distinct from old.paid_amount then
    if old.metadata ->> 'treatment' is distinct from 'payable' then
      raise exception 'Este lançamento já nasce pago pela despesa da viagem.'
        using errcode = 'P0001';
    end if;

    if new.entry_status not in ('pending', 'paid', 'overdue') then
      raise exception 'Para cancelar, exclua ou altere a despesa na viagem.'
        using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists financial_entries_guard_trip_expense on public.financial_entries;

create trigger financial_entries_guard_trip_expense
  before insert or update or delete on public.financial_entries
  for each row
  execute function public.guard_trip_expense_entry();

-- Funções internas não ficam expostas pela API.
revoke all on function public.close_trip_expense_entry(uuid, uuid) from public, anon, authenticated;
revoke all on function public.sync_trip_expense_entry() from public, anon, authenticated;
revoke all on function public.close_trip_expense_entry_on_delete() from public, anon, authenticated;
revoke all on function public.guard_trip_expense_entry() from public, anon, authenticated;
revoke all on function public.request_is_hml_company_reset() from public, anon, authenticated;
revoke all on function public.trip_expense_financial_treatment(text, text) from public, anon, authenticated;
revoke all on function public.trip_expense_category_slug(public.trip_expense_type) from public, anon, authenticated;
revoke all on function public.trip_expense_type_label(public.trip_expense_type) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- trip_financial_summary: grupo "despesas de viagem"
-- ---------------------------------------------------------------------------
-- Igual à 110, com uma coluna nova no fim (trip_expense_costs). Combustível,
-- manutenção e pneus deixam de contar a origem trip_expense, que passa a ter o
-- grupo próprio, como na DRE. Outros = custo direto − os quatro grupos.

create or replace view public.trip_financial_summary
with (security_invoker = true)
as
select
  t.id as trip_id,
  t.company_id,
  t.trip_number,
  t.trip_status,
  t.completed_at,
  round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0)::numeric, 2)
    as freight_amount,
  case when vis.visible then costs.direct_costs end as direct_costs,
  case when vis.visible then costs.fuel_costs end as fuel_costs,
  case when vis.visible then costs.maintenance_costs end as maintenance_costs,
  case when vis.visible then costs.tire_costs end as tire_costs,
  case when vis.visible then
    costs.direct_costs - costs.fuel_costs - costs.maintenance_costs - costs.tire_costs
      - costs.trip_expense_costs
  end as other_costs,
  case when vis.visible then costs.direct_cost_entries end as direct_cost_entries,
  case when vis.visible then
    round(coalesce(t.actual_freight_value, t.contracted_freight_value, 0)::numeric, 2)
      - costs.direct_costs
  end as result,
  case
    when vis.visible
      and coalesce(t.actual_freight_value, t.contracted_freight_value, 0) > 0 then round(
      (
        (coalesce(t.actual_freight_value, t.contracted_freight_value, 0) - costs.direct_costs)
        / coalesce(t.actual_freight_value, t.contracted_freight_value, 0)
      ) * 100,
      2
    )
  end as margin_percent,
  case when vis.visible then costs.advances_total end as advances_total,
  case when vis.visible then costs.reimbursements_total end as reimbursements_total,
  case when vis.visible then aba.unposted_trip_expenses_amount end
    as unposted_trip_expenses_amount,
  case when vis.visible then aba.unposted_trip_expenses_count end
    as unposted_trip_expenses_count,
  aba.legacy_advance_expenses_amount,
  aba.legacy_advance_expenses_count,
  case when vis.visible then charge.receivable_entry_id end as receivable_entry_id,
  case when vis.visible then charge.receivable_status end as receivable_status,
  case when vis.visible then charge.receivable_amount end as receivable_amount,
  case when vis.visible then charge.receivable_received end as receivable_received,
  case
    when vis.visible and charge.receivable_entry_id is not null
      then charge.receivable_amount - charge.receivable_received
  end as receivable_balance,
  vis.visible as financial_visible,
  case when vis.visible then costs.trip_expense_costs end as trip_expense_costs
from public.trips t
cross join lateral (
  select coalesce(
    public.has_company_permission(t.company_id, 'financeiro:read')
    or public.is_company_super_admin(t.company_id)
    or (select r.rolbypassrls from pg_catalog.pg_roles r where r.rolname = current_user),
    false
  ) as visible
) vis
cross join lateral (
  select
    coalesce(round(sum(fe.amount) filter (where fe.entry_type = 'expense'), 2), 0)
      as direct_costs,
    coalesce(round(sum(fe.amount) filter (
      where fe.entry_type = 'expense'
        and fe.source_module = 'trip_expense'
    ), 2), 0) as trip_expense_costs,
    coalesce(round(sum(fe.amount) filter (
      where fe.entry_type = 'expense'
        and fe.source_module is distinct from 'trip_expense'
        and (fc.slug = 'combustivel' or fe.fuel_record_id is not null)
    ), 2), 0) as fuel_costs,
    coalesce(round(sum(fe.amount) filter (
      where fe.entry_type = 'expense'
        and fe.source_module is distinct from 'trip_expense'
        and not (fc.slug is not distinct from 'combustivel' or fe.fuel_record_id is not null)
        and (fc.slug = 'manutencao' or fe.maintenance_record_id is not null)
    ), 2), 0) as maintenance_costs,
    coalesce(round(sum(fe.amount) filter (
      where fe.entry_type = 'expense'
        and fe.source_module is distinct from 'trip_expense'
        and not (fc.slug is not distinct from 'combustivel' or fe.fuel_record_id is not null)
        and not (fc.slug is not distinct from 'manutencao' or fe.maintenance_record_id is not null)
        and (fc.slug = 'pneus' or fe.tire_id is not null)
    ), 2), 0) as tire_costs,
    count(*) filter (where fe.entry_type = 'expense')::integer as direct_cost_entries,
    coalesce(round(sum(fe.amount) filter (where fe.entry_type = 'advance'), 2), 0)
      as advances_total,
    coalesce(round(sum(fe.amount) filter (where fe.entry_type = 'reimbursement'), 2), 0)
      as reimbursements_total
  from public.financial_entries fe
  left join public.financial_categories fc on fc.id = fe.category_id
  where fe.company_id = t.company_id
    and fe.trip_id = t.id
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
    and fe.entry_type in ('expense', 'advance', 'reimbursement')
) costs
cross join lateral (
  select
    coalesce(round(sum(te.amount) filter (
      where te.expense_type <> 'advance'
        and te.paid_by is distinct from 'third_party'
        and not exists (
          select 1
          from public.financial_entries posted
          where posted.company_id = te.company_id
            and posted.source_module = 'trip_expense'
            and posted.source_id = te.id
            and posted.deleted_at is null
            and posted.entry_status not in ('cancelled', 'reversed')
            and posted.entry_type <> 'reversal'
        )
    ), 2), 0) as unposted_trip_expenses_amount,
    count(*) filter (
      where te.expense_type <> 'advance'
        and te.paid_by is distinct from 'third_party'
        and not exists (
          select 1
          from public.financial_entries posted
          where posted.company_id = te.company_id
            and posted.source_module = 'trip_expense'
            and posted.source_id = te.id
            and posted.deleted_at is null
            and posted.entry_status not in ('cancelled', 'reversed')
            and posted.entry_type <> 'reversal'
        )
    )::integer as unposted_trip_expenses_count,
    coalesce(round(sum(te.amount) filter (where te.expense_type = 'advance'), 2), 0)
      as legacy_advance_expenses_amount,
    count(*) filter (where te.expense_type = 'advance')::integer
      as legacy_advance_expenses_count
  from public.trip_expenses te
  where te.company_id = t.company_id
    and te.trip_id = t.id
    and te.deleted_at is null
) aba
left join lateral (
  select
    fe.id as receivable_entry_id,
    fe.entry_status as receivable_status,
    round((fe.amount + coalesce(fe.adjustment_total, 0))::numeric, 2) as receivable_amount,
    round(coalesce(fe.paid_amount, 0)::numeric, 2) as receivable_received
  from public.financial_entries fe
  where fe.company_id = t.company_id
    and fe.trip_id = t.id
    and fe.trip_charge_key = 'freight'
    and fe.deleted_at is null
    and fe.entry_status not in ('cancelled', 'reversed')
  order by fe.created_at
  limit 1
) charge on true
where t.deleted_at is null;

comment on view public.trip_financial_summary is
  'Fase 1: resultado da viagem = frete − custo direto em financial_entries (mesma regra da DRE). Despesas de viagem em grupo próprio. Adiantamento fica fora do custo.';
