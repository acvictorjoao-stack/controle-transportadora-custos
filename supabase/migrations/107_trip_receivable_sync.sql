-- FleetControl — Título de frete sincronizado com a viagem
-- O trigger em trips roda na mesma transação da viagem: se o título falhar, a
-- viagem não é salva. Recebimentos, estornos e ajustes passam por RPCs que
-- travam o título, validam empresa e permissão e são idempotentes.
-- auth.uid() nulo = service role, a mesma convenção das migrations 098 e 099.

-- ---------------------------------------------------------------------------
-- Contexto
-- ---------------------------------------------------------------------------

create or replace function public.request_is_service_context()
returns boolean
language sql
stable
set search_path = public
as $$
  select auth.uid() is null
    and coalesce(
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
      'service_role'
    ) = 'service_role';
$$;

create or replace function public.assert_receivable_actor(
  p_company_id uuid,
  p_permission text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.request_is_service_context() then
    return;
  end if;

  if auth.uid() is null then
    raise exception 'Sessão inválida.' using errcode = '42501';
  end if;

  if not (
    public.has_company_permission(p_company_id, p_permission)
    or public.is_company_super_admin(p_company_id)
  ) then
    raise exception 'Sem permissão para esta operação.' using errcode = '42501';
  end if;
end;
$$;

-- Recalcula os totais do título a partir dos movimentos. Única origem de
-- paid_amount, adjustment_total e do status de quitação de títulos com movimentos.
create or replace function public.recompute_receivable_entry(p_entry_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_received numeric(14, 2);
  v_adjustment numeric(14, 2);
  v_last_receipt date;
  v_entry public.financial_entries%rowtype;
  v_settled boolean;
begin
  select * into v_entry
  from public.financial_entries
  where id = p_entry_id
  for update;

  select
    coalesce(sum(case kind
      when 'receipt' then amount
      when 'receipt_reversal' then -amount
      else 0
    end), 0),
    coalesce(sum(case when kind = 'adjustment' then amount else 0 end), 0),
    max(case when kind = 'receipt' then movement_date end)
  into v_received, v_adjustment, v_last_receipt
  from public.financial_entry_movements
  where financial_entry_id = p_entry_id;

  v_settled := v_received > 0 and v_received >= v_entry.amount + v_adjustment;

  perform set_config('fleetcontrol.receivable_internal', 'on', true);

  update public.financial_entries
  set
    paid_amount = nullif(v_received, 0),
    adjustment_total = v_adjustment,
    entry_status = case
      when v_settled then 'paid'::public.financial_entry_status
      else 'pending'::public.financial_entry_status
    end,
    paid_at = case
      when v_settled then (v_last_receipt::timestamp + interval '12 hours') at time zone 'utc'
      else null
    end,
    updated_by = coalesce(auth.uid(), updated_by)
  where id = p_entry_id;

  perform set_config('fleetcontrol.receivable_internal', 'off', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Proteção do título
-- ---------------------------------------------------------------------------

create or replace function public.guard_receivable_entry()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_movements boolean;
begin
  if coalesce(current_setting('fleetcontrol.receivable_internal', true), 'off') = 'on'
     or public.request_is_service_context() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if old.source_module is distinct from 'accounts_receivable' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select exists (
    select 1
    from public.financial_entry_movements m
    where m.financial_entry_id = old.id
  )
  into v_has_movements;

  if tg_op = 'DELETE' then
    if v_has_movements or old.trip_charge_key is not null then
      raise exception 'Este título não pode ser excluído.' using errcode = 'P0001';
    end if;
    return old;
  end if;

  if new.company_id is distinct from old.company_id
     or new.trip_id is distinct from old.trip_id
     or new.trip_charge_key is distinct from old.trip_charge_key
     or new.source_module is distinct from old.source_module
     or new.source_id is distinct from old.source_id
     or new.entry_type is distinct from old.entry_type
     or new.adjustment_total is distinct from old.adjustment_total
     or new.paid_amount is distinct from old.paid_amount
     or new.paid_at is distinct from old.paid_at then
    raise exception 'Use o registro de recebimento para alterar valores recebidos.'
      using errcode = 'P0001';
  end if;

  if new.entry_status is distinct from old.entry_status
     and new.entry_status = 'paid' then
    raise exception 'Use o registro de recebimento para quitar o título.'
      using errcode = 'P0001';
  end if;

  if old.trip_charge_key is not null
     and (
       new.amount is distinct from old.amount
       or new.entry_status is distinct from old.entry_status
       or new.deleted_at is distinct from old.deleted_at
       or new.customer_id is distinct from old.customer_id
       or new.client is distinct from old.client
       or new.entry_date is distinct from old.entry_date
       or new.due_date is distinct from old.due_date
     ) then
    raise exception 'Este título é controlado pela viagem de origem.'
      using errcode = 'P0001';
  end if;

  if v_has_movements
     and (
       new.amount is distinct from old.amount
       or new.entry_status is distinct from old.entry_status
       or new.deleted_at is distinct from old.deleted_at
     ) then
    raise exception 'Título com movimentos só muda por ajuste ou estorno.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

create trigger financial_entries_guard_receivable
  before update or delete on public.financial_entries
  for each row
  execute function public.guard_receivable_entry();

-- ---------------------------------------------------------------------------
-- Sincronização viagem → título
-- ---------------------------------------------------------------------------

create or replace function public.sync_trip_receivable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_freight numeric(14, 2) := coalesce(new.actual_freight_value, new.contracted_freight_value, 0);
  v_closing boolean := new.deleted_at is not null or new.trip_status = 'cancelled';
  v_title public.financial_entries%rowtype;
  v_customer_name text;
  v_actor uuid := coalesce(auth.uid(), new.updated_by, new.created_by);
  v_has_movements boolean := false;
  v_received numeric(14, 2) := 0;
  v_category_id uuid;
  v_cost_center_id uuid;
begin
  select * into v_title
  from public.financial_entries fe
  where fe.company_id = new.company_id
    and fe.trip_id = new.id
    and fe.trip_charge_key = 'freight'
  for update;

  if v_title.id is null
     and (new.payment_condition is null or v_freight <= 0 or v_closing) then
    return new;
  end if;

  -- O ajuste financeiro já validou o Financeiro e atualiza a viagem por dentro.
  if coalesce(current_setting('fleetcontrol.receivable_internal', true), 'off') <> 'on' then
    perform public.assert_receivable_actor(
      new.company_id,
      case when tg_op = 'INSERT' then 'trips:create' else 'trips:update' end
    );
  end if;

  if v_title.id is not null then
    select
      exists (
        select 1
        from public.financial_entry_movements m
        where m.financial_entry_id = v_title.id
      ),
      coalesce(v_title.paid_amount, 0)
    into v_has_movements, v_received;
  end if;

  if v_closing then
    if v_title.id is null or v_title.entry_status = 'cancelled' then
      return new;
    end if;

    if v_received > 0 then
      raise exception 'Esta viagem tem recebimentos. O Financeiro precisa estornar os valores antes do cancelamento.'
        using errcode = 'P0001';
    end if;

    perform set_config('fleetcontrol.receivable_internal', 'on', true);
    update public.financial_entries
    set entry_status = 'cancelled', updated_by = v_actor
    where id = v_title.id;
    perform set_config('fleetcontrol.receivable_internal', 'off', true);
    return new;
  end if;

  if new.customer_id is not null then
    select coalesce(c.trade_name, c.legal_name)
    into v_customer_name
    from public.customers c
    where c.id = new.customer_id
      and c.company_id = new.company_id;

    if v_customer_name is null then
      raise exception 'Cliente não pertence a esta empresa.' using errcode = '42501';
    end if;
  end if;

  if v_title.id is null then
    if new.customer_id is null then
      raise exception 'Informe o cliente para gerar o título do frete.' using errcode = 'P0001';
    end if;

    -- Viagem antiga já tem receita lançada: uma segunda receita nunca é criada.
    if exists (
      select 1
      from public.financial_entries fe
      where fe.company_id = new.company_id
        and fe.trip_id = new.id
        and fe.entry_type = 'revenue'
        and fe.deleted_at is null
        and fe.entry_status not in ('cancelled', 'reversed')
    ) then
      raise exception 'Esta viagem já possui receita lançada.' using errcode = 'P0001';
    end if;

    select fc.id into v_category_id
    from public.financial_categories fc
    where fc.company_id = new.company_id
      and fc.slug = 'receitas'
      and fc.deleted_at is null
    limit 1;

    select cc.id into v_cost_center_id
    from public.cost_centers cc
    where cc.company_id = new.company_id
      and cc.code = 'OPERACIONAL'
      and cc.deleted_at is null
    limit 1;

    insert into public.financial_entries (
      company_id, branch_id, vehicle_id, driver_id, trip_id,
      customer_id, customer_contract_id, category_id, cost_center_id,
      entry_type, entry_status, description, reference_number, client,
      amount, currency, entry_date, due_date,
      source_module, source_id, is_system_generated, trip_charge_key,
      installment_number, installment_total, metadata,
      created_by, updated_by
    )
    values (
      new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.id,
      new.customer_id, new.customer_contract_id, v_category_id, v_cost_center_id,
      'revenue', 'pending', 'Frete da viagem ' || new.trip_number, new.trip_number,
      coalesce(v_customer_name, new.client_name),
      v_freight, 'BRL',
      coalesce(new.payment_issue_date, (timezone('America/Sao_Paulo', now()))::date),
      new.payment_due_date,
      'accounts_receivable', new.id, true, 'freight',
      1, 1, jsonb_build_object('payment_condition', new.payment_condition),
      v_actor, v_actor
    )
    on conflict (company_id, trip_id, trip_charge_key)
      where trip_charge_key is not null
      do nothing;

    return new;
  end if;

  if v_has_movements then
    if v_freight <> v_title.amount + v_title.adjustment_total then
      raise exception 'Esta viagem tem movimentos financeiros. Altere o frete por um ajuste no título.'
        using errcode = 'P0001';
    end if;

    if new.customer_id is distinct from v_title.customer_id then
      raise exception 'Esta viagem tem movimentos financeiros. O cliente não pode ser alterado.'
        using errcode = 'P0001';
    end if;
  end if;

  if not v_has_movements and (v_freight <= 0 or new.payment_condition is null) then
    if v_title.entry_status <> 'cancelled' then
      perform set_config('fleetcontrol.receivable_internal', 'on', true);
      update public.financial_entries
      set entry_status = 'cancelled', updated_by = v_actor
      where id = v_title.id;
      perform set_config('fleetcontrol.receivable_internal', 'off', true);
    end if;
    return new;
  end if;

  perform set_config('fleetcontrol.receivable_internal', 'on', true);

  update public.financial_entries fe
  set
    amount = case when v_has_movements then fe.amount else v_freight end,
    entry_status = case
      when fe.entry_status = 'cancelled' then 'pending'::public.financial_entry_status
      else fe.entry_status
    end,
    customer_id = new.customer_id,
    customer_contract_id = new.customer_contract_id,
    client = coalesce(v_customer_name, new.client_name),
    branch_id = new.branch_id,
    vehicle_id = new.vehicle_id,
    driver_id = new.driver_id,
    entry_date = coalesce(new.payment_issue_date, fe.entry_date),
    due_date = new.payment_due_date,
    metadata = fe.metadata || jsonb_build_object('payment_condition', new.payment_condition),
    updated_by = v_actor
  where fe.id = v_title.id
    and (
      fe.amount is distinct from (case when v_has_movements then fe.amount else v_freight end)
      or fe.entry_status = 'cancelled'
      or fe.customer_id is distinct from new.customer_id
      or fe.customer_contract_id is distinct from new.customer_contract_id
      or fe.client is distinct from coalesce(v_customer_name, new.client_name)
      or fe.branch_id is distinct from new.branch_id
      or fe.vehicle_id is distinct from new.vehicle_id
      or fe.driver_id is distinct from new.driver_id
      or fe.entry_date is distinct from coalesce(new.payment_issue_date, fe.entry_date)
      or fe.due_date is distinct from new.payment_due_date
      or fe.metadata ->> 'payment_condition' is distinct from new.payment_condition
    );

  perform set_config('fleetcontrol.receivable_internal', 'off', true);
  return new;
end;
$$;

create trigger trips_sync_receivable
  after insert or update on public.trips
  for each row
  execute function public.sync_trip_receivable();

-- ---------------------------------------------------------------------------
-- RPCs de movimento
-- ---------------------------------------------------------------------------

create or replace function public.log_receivable_movement(
  p_entry public.financial_entries,
  p_action text,
  p_changes jsonb
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.financial_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    financial_entry_id, action, changes, created_by
  )
  values (
    p_entry.company_id, p_entry.branch_id, p_entry.vehicle_id, p_entry.driver_id,
    p_entry.trip_id, p_entry.id, p_action, p_changes, auth.uid()
  );
$$;

create or replace function public.register_receivable_receipt(
  p_entry_id uuid,
  p_amount numeric,
  p_movement_date date,
  p_payment_method text,
  p_notes text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.financial_entries%rowtype;
  v_existing public.financial_entry_movements%rowtype;
  v_balance numeric(14, 2);
  v_id uuid;
begin
  select * into v_entry
  from public.financial_entries
  where id = p_entry_id
    and deleted_at is null
  for update;

  if v_entry.id is null
     or v_entry.source_module is distinct from 'accounts_receivable'
     or v_entry.entry_type <> 'revenue' then
    raise exception 'Conta a receber não encontrada.' using errcode = 'P0002';
  end if;

  perform public.assert_receivable_actor(v_entry.company_id, 'financeiro:update');

  select * into v_existing
  from public.financial_entry_movements
  where company_id = v_entry.company_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.financial_entry_id <> p_entry_id or v_existing.kind <> 'receipt' then
      raise exception 'Chave de operação já utilizada.' using errcode = 'P0001';
    end if;
    return v_existing.id;
  end if;

  if v_entry.entry_status not in ('pending', 'overdue') then
    raise exception 'Somente títulos em aberto podem receber pagamentos.' using errcode = 'P0001';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Informe um valor válido.' using errcode = 'P0001';
  end if;

  if p_movement_date is null
     or p_movement_date > (timezone('America/Sao_Paulo', now()))::date then
    raise exception 'A data do recebimento não pode ser futura.' using errcode = 'P0001';
  end if;

  v_balance := v_entry.amount + v_entry.adjustment_total - coalesce(v_entry.paid_amount, 0);

  if p_amount > v_balance then
    raise exception 'O valor excede o saldo em aberto do título.' using errcode = 'P0001';
  end if;

  insert into public.financial_entry_movements (
    company_id, financial_entry_id, kind, amount, movement_date,
    payment_method, notes, idempotency_key, created_by
  )
  values (
    v_entry.company_id, v_entry.id, 'receipt', p_amount, p_movement_date,
    p_payment_method, nullif(trim(p_notes), ''), p_idempotency_key, auth.uid()
  )
  returning id into v_id;

  perform public.recompute_receivable_entry(v_entry.id);
  perform public.log_receivable_movement(
    v_entry,
    'receipt',
    jsonb_build_object(
      'movement_id', v_id,
      'amount', p_amount,
      'movement_date', p_movement_date,
      'payment_method', p_payment_method
    )
  );

  return v_id;
end;
$$;

create or replace function public.reverse_receivable_receipt(
  p_movement_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.financial_entry_movements%rowtype;
  v_entry public.financial_entries%rowtype;
  v_existing public.financial_entry_movements%rowtype;
  v_id uuid;
begin
  select * into v_receipt
  from public.financial_entry_movements
  where id = p_movement_id;

  if v_receipt.id is null or v_receipt.kind <> 'receipt' then
    raise exception 'Recebimento não encontrado.' using errcode = 'P0002';
  end if;

  select * into v_entry
  from public.financial_entries
  where id = v_receipt.financial_entry_id
    and deleted_at is null
  for update;

  if v_entry.id is null then
    raise exception 'Conta a receber não encontrada.' using errcode = 'P0002';
  end if;

  perform public.assert_receivable_actor(v_entry.company_id, 'financeiro:update');

  select * into v_existing
  from public.financial_entry_movements
  where company_id = v_entry.company_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.reverses_movement_id is distinct from p_movement_id then
      raise exception 'Chave de operação já utilizada.' using errcode = 'P0001';
    end if;
    return v_existing.id;
  end if;

  if exists (
    select 1
    from public.financial_entry_movements m
    where m.reverses_movement_id = p_movement_id
  ) then
    raise exception 'Este recebimento já foi estornado.' using errcode = 'P0001';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Informe o motivo do estorno.' using errcode = 'P0001';
  end if;

  insert into public.financial_entry_movements (
    company_id, financial_entry_id, kind, amount, movement_date,
    reason, reverses_movement_id, idempotency_key, created_by
  )
  values (
    v_entry.company_id, v_entry.id, 'receipt_reversal', v_receipt.amount,
    (timezone('America/Sao_Paulo', now()))::date,
    trim(p_reason), p_movement_id, p_idempotency_key, auth.uid()
  )
  returning id into v_id;

  perform public.recompute_receivable_entry(v_entry.id);
  perform public.log_receivable_movement(
    v_entry,
    'receipt_reversal',
    jsonb_build_object(
      'movement_id', v_id,
      'reverses_movement_id', p_movement_id,
      'amount', v_receipt.amount,
      'reason', trim(p_reason)
    )
  );

  return v_id;
end;
$$;

create or replace function public.adjust_receivable_amount(
  p_entry_id uuid,
  p_new_amount numeric,
  p_reason text,
  p_idempotency_key text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry public.financial_entries%rowtype;
  v_existing public.financial_entry_movements%rowtype;
  v_current numeric(14, 2);
  v_id uuid;
begin
  select * into v_entry
  from public.financial_entries
  where id = p_entry_id
    and deleted_at is null
  for update;

  if v_entry.id is null
     or v_entry.source_module is distinct from 'accounts_receivable'
     or v_entry.entry_type <> 'revenue' then
    raise exception 'Conta a receber não encontrada.' using errcode = 'P0002';
  end if;

  perform public.assert_receivable_actor(v_entry.company_id, 'financeiro:update');

  select * into v_existing
  from public.financial_entry_movements
  where company_id = v_entry.company_id
    and idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.financial_entry_id <> p_entry_id or v_existing.kind <> 'adjustment' then
      raise exception 'Chave de operação já utilizada.' using errcode = 'P0001';
    end if;
    return v_existing.id;
  end if;

  if v_entry.entry_status in ('cancelled', 'reversed') then
    raise exception 'Título cancelado não pode ser ajustado.' using errcode = 'P0001';
  end if;

  if length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Informe o motivo do ajuste.' using errcode = 'P0001';
  end if;

  if p_new_amount is null or p_new_amount <= 0 then
    raise exception 'Informe um valor válido.' using errcode = 'P0001';
  end if;

  if p_new_amount < coalesce(v_entry.paid_amount, 0) then
    raise exception 'O novo valor é menor que o recebido. Estorne os recebimentos antes do ajuste.'
      using errcode = 'P0001';
  end if;

  v_current := v_entry.amount + v_entry.adjustment_total;

  if p_new_amount = v_current then
    raise exception 'O novo valor é igual ao valor atual.' using errcode = 'P0001';
  end if;

  insert into public.financial_entry_movements (
    company_id, financial_entry_id, kind, amount, movement_date,
    reason, idempotency_key, created_by
  )
  values (
    v_entry.company_id, v_entry.id, 'adjustment', p_new_amount - v_current,
    (timezone('America/Sao_Paulo', now()))::date,
    trim(p_reason), p_idempotency_key, auth.uid()
  )
  returning id into v_id;

  perform public.recompute_receivable_entry(v_entry.id);
  perform public.log_receivable_movement(
    v_entry,
    'adjustment',
    jsonb_build_object(
      'movement_id', v_id,
      'from', v_current,
      'to', p_new_amount,
      'reason', trim(p_reason)
    )
  );

  -- O título já reflete o novo valor, então a validação do trigger da viagem passa.
  if v_entry.trip_charge_key is not null then
    perform set_config('fleetcontrol.receivable_internal', 'on', true);
    update public.trips
    set actual_freight_value = p_new_amount, updated_by = coalesce(auth.uid(), updated_by)
    where id = v_entry.trip_id
      and company_id = v_entry.company_id;
    perform set_config('fleetcontrol.receivable_internal', 'off', true);
  end if;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: só as RPCs de negócio ficam expostas
-- ---------------------------------------------------------------------------

revoke all on function public.request_is_service_context() from public, anon;
revoke all on function public.assert_receivable_actor(uuid, text) from public, anon, authenticated;
revoke all on function public.recompute_receivable_entry(uuid) from public, anon, authenticated;
revoke all on function public.log_receivable_movement(public.financial_entries, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.register_receivable_receipt(uuid, numeric, date, text, text, text)
  from public, anon;
revoke all on function public.reverse_receivable_receipt(uuid, text, text) from public, anon;
revoke all on function public.adjust_receivable_amount(uuid, numeric, text, text) from public, anon;

grant execute on function public.request_is_service_context() to authenticated;
grant execute on function public.register_receivable_receipt(uuid, numeric, date, text, text, text)
  to authenticated;
grant execute on function public.reverse_receivable_receipt(uuid, text, text) to authenticated;
grant execute on function public.adjust_receivable_amount(uuid, numeric, text, text) to authenticated;
