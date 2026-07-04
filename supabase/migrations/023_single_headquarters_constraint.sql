-- FleetControl Sprint 16 — enforce single headquarters (matriz) per company

create unique index if not exists idx_branches_single_headquarters
  on public.branches (company_id)
  where deleted_at is null and is_headquarters = true;

create or replace function public.enforce_single_headquarters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.is_headquarters = true and NEW.deleted_at is null then
    update public.branches
    set is_headquarters = false,
        updated_at = timezone('utc', now())
    where company_id = NEW.company_id
      and id <> NEW.id
      and deleted_at is null
      and is_headquarters = true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists branches_enforce_single_headquarters on public.branches;

create trigger branches_enforce_single_headquarters
  after insert or update of is_headquarters, deleted_at
  on public.branches
  for each row
  execute function public.enforce_single_headquarters();
