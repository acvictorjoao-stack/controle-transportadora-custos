-- FleetControl Sprint 25.1 — Row Level Security for routes module

-- ---------------------------------------------------------------------------
-- routes
-- ---------------------------------------------------------------------------

create policy routes_select_authorized
  on public.routes
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'routes:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy routes_insert_authorized
  on public.routes
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'routes:create')
    or public.is_company_super_admin(company_id)
  );

create policy routes_update_authorized
  on public.routes
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'routes:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'routes:update')
    or public.is_company_super_admin(company_id)
  );

create policy routes_delete_authorized
  on public.routes
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'routes:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- route_history
-- ---------------------------------------------------------------------------

create policy route_history_select_authorized
  on public.route_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'routes:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy route_history_insert_system
  on public.route_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- route_documents
-- ---------------------------------------------------------------------------

create policy route_documents_select_authorized
  on public.route_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'routes:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy route_documents_insert_authorized
  on public.route_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'routes:update')
    or public.is_company_super_admin(company_id)
  );

create policy route_documents_update_authorized
  on public.route_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'routes:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'routes:update')
    or public.is_company_super_admin(company_id)
  );

create policy route_documents_delete_authorized
  on public.route_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'routes:delete')
    or public.is_company_super_admin(company_id)
  );
