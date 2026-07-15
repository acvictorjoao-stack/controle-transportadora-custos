-- FleetControl Sprint 26.2 — Contas a Receber (V1)
-- Extends financial_entries with free-text client (mirror of supplier). No new ledger table.

alter table public.financial_entries
  add column if not exists client text;

create index if not exists idx_financial_entries_company_client
  on public.financial_entries (company_id, client)
  where deleted_at is null and client is not null;

comment on column public.financial_entries.client is
  'Free-text client name (Contas a Receber / AR)';

-- Enrich history payload for AR-relevant field changes (keeps AP supplier tracking)
create or replace function public.log_financial_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changes jsonb := '{}'::jsonb;
  v_action text := 'update';
begin
  if tg_op = 'INSERT' then
    v_action := 'create';
    v_changes := jsonb_build_object(
      'entry_type', new.entry_type,
      'entry_status', new.entry_status,
      'amount', new.amount,
      'description', new.description,
      'supplier', new.supplier,
      'client', new.client
    );
  elsif tg_op = 'UPDATE' then
    if old.deleted_at is null and new.deleted_at is not null then
      v_action := 'soft_delete';
      v_changes := jsonb_build_object('deleted_at', new.deleted_at);
    elsif old.entry_status is distinct from new.entry_status then
      if new.entry_status = 'paid' then
        v_action := 'payment';
        v_changes := jsonb_build_object(
          'from', old.entry_status,
          'to', new.entry_status,
          'paid_at', new.paid_at,
          'paid_amount', new.paid_amount
        );
      elsif new.entry_status = 'cancelled' then
        v_action := 'cancellation';
        v_changes := jsonb_build_object(
          'from', old.entry_status,
          'to', new.entry_status
        );
      elsif new.entry_status = 'reversed' then
        v_action := 'reversal';
        v_changes := jsonb_build_object(
          'from', old.entry_status,
          'to', new.entry_status
        );
      else
        v_action := 'status_change';
        v_changes := jsonb_build_object(
          'from', old.entry_status,
          'to', new.entry_status
        );
      end if;
    else
      v_action := 'update';
      v_changes := jsonb_strip_nulls(jsonb_build_object(
        'amount', case when old.amount is distinct from new.amount then jsonb_build_object('from', old.amount, 'to', new.amount) end,
        'paid_amount', case when old.paid_amount is distinct from new.paid_amount then jsonb_build_object('from', old.paid_amount, 'to', new.paid_amount) end,
        'description', case when old.description is distinct from new.description then jsonb_build_object('from', old.description, 'to', new.description) end,
        'supplier', case when old.supplier is distinct from new.supplier then jsonb_build_object('from', old.supplier, 'to', new.supplier) end,
        'client', case when old.client is distinct from new.client then jsonb_build_object('from', old.client, 'to', new.client) end,
        'entry_date', case when old.entry_date is distinct from new.entry_date then jsonb_build_object('from', old.entry_date, 'to', new.entry_date) end,
        'due_date', case when old.due_date is distinct from new.due_date then jsonb_build_object('from', old.due_date, 'to', new.due_date) end,
        'category_id', case when old.category_id is distinct from new.category_id then jsonb_build_object('from', old.category_id, 'to', new.category_id) end,
        'cost_center_id', case when old.cost_center_id is distinct from new.cost_center_id then jsonb_build_object('from', old.cost_center_id, 'to', new.cost_center_id) end,
        'notes', case when old.notes is distinct from new.notes then jsonb_build_object('from', old.notes, 'to', new.notes) end
      ));
    end if;
  end if;

  insert into public.financial_history (
    company_id, branch_id, vehicle_id, driver_id, trip_id,
    fuel_record_id, maintenance_record_id, tire_id,
    financial_entry_id, action, changes, created_by
  )
  values (
    new.company_id, new.branch_id, new.vehicle_id, new.driver_id, new.trip_id,
    new.fuel_record_id, new.maintenance_record_id, new.tire_id,
    new.id, v_action, v_changes, coalesce(new.updated_by, new.created_by)
  );

  return new;
end;
$$;
