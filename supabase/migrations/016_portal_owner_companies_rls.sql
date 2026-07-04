-- FleetControl Sprint 13 — Portal Master OWNER access to companies

create policy companies_select_portal_owner
  on public.companies
  for select
  to authenticated
  using (public.is_portal_owner());

create policy companies_update_portal_owner
  on public.companies
  for update
  to authenticated
  using (public.is_portal_owner())
  with check (public.is_portal_owner());
