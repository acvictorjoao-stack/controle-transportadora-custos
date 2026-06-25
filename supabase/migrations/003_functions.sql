-- FleetControl Sprint 9 — Shared database functions

-- Automatically maintain updated_at on row changes
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

comment on function public.set_updated_at() is 'Trigger function: sets updated_at to current UTC timestamp';
