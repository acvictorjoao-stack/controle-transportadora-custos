-- FleetControl Sprint 15 — Portal Master OWNER read access to tenant data

create policy profiles_select_portal_owner
  on public.profiles
  for select
  to authenticated
  using (public.is_portal_owner());

create policy company_members_select_portal_owner
  on public.company_members
  for select
  to authenticated
  using (public.is_portal_owner());

create policy branches_select_portal_owner
  on public.branches
  for select
  to authenticated
  using (public.is_portal_owner());

create policy roles_select_portal_owner
  on public.roles
  for select
  to authenticated
  using (public.is_portal_owner());
