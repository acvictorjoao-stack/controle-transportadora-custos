-- FleetControl Sprint 15.1 — Restrict companies INSERT to Portal Master OWNER

drop policy if exists companies_insert_authenticated on public.companies;

create policy companies_insert_portal_owner
  on public.companies
  for insert
  to authenticated
  with check (public.is_portal_owner());

comment on policy companies_insert_portal_owner on public.companies is
  'Only platform OWNER can create companies (Master Portal provisioning)';
