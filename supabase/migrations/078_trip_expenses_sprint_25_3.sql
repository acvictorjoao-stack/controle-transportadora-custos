-- Sprint 25.3 — Trip expenses: expand types, notes, history

-- ---------------------------------------------------------------------------
-- Expand trip_expense_type for operational expense categories
-- ---------------------------------------------------------------------------

alter type public.trip_expense_type add value if not exists 'parking';
alter type public.trip_expense_type add value if not exists 'ferry';
alter type public.trip_expense_type add value if not exists 'wash';
alter type public.trip_expense_type add value if not exists 'advance';
alter type public.trip_expense_type add value if not exists 'fine';

comment on type public.trip_expense_type is
  'Expense categories registered on trips (no automatic finance posting)';

-- ---------------------------------------------------------------------------
-- Complete trip_expenses columns
-- ---------------------------------------------------------------------------

alter table public.trip_expenses
  add column if not exists notes text;

comment on column public.trip_expenses.notes is
  'Optional observation for the trip expense entry';

comment on column public.trip_expenses.receipt_url is
  'Optional receipt/comprovante URL stored in trip-files bucket';

comment on table public.trip_expenses is
  'Manual trip expenses — register and view only; no financial auto-generation';

-- ---------------------------------------------------------------------------
-- History: create / update / soft-delete
-- ---------------------------------------------------------------------------

create or replace function public.log_trip_expense_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_actor uuid;
  v_row public.trip_expenses%rowtype;
begin
  if tg_op = 'DELETE' then
    v_row := old;
    v_action := 'expense_delete';
    v_actor := old.updated_by;
  else
    v_row := new;
    v_actor := coalesce(new.updated_by, new.created_by);

    if tg_op = 'INSERT' then
      v_action := 'expense_create';
    elsif new.deleted_at is not null and old.deleted_at is null then
      v_action := 'expense_delete';
    else
      v_action := 'expense_update';
    end if;
  end if;

  insert into public.trip_history (
    company_id, branch_id, trip_id, action, changes, created_by
  )
  values (
    v_row.company_id,
    v_row.branch_id,
    v_row.trip_id,
    v_action,
    jsonb_build_object(
      'expense_id', v_row.id,
      'expense_type', v_row.expense_type,
      'amount', v_row.amount,
      'currency', v_row.currency,
      'description', v_row.description,
      'notes', v_row.notes,
      'expense_date', v_row.expense_date,
      'receipt_url', v_row.receipt_url
    ),
    v_actor
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trip_expenses_log_history on public.trip_expenses;

create trigger trip_expenses_log_history
  after insert or update on public.trip_expenses
  for each row
  execute function public.log_trip_expense_history();
