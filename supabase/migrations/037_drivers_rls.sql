-- FleetControl Sprint 18 — Row Level Security for drivers module

-- ---------------------------------------------------------------------------
-- drivers
-- ---------------------------------------------------------------------------

create policy drivers_select_authorized
  on public.drivers
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'drivers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy drivers_insert_authorized
  on public.drivers
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'drivers:create')
    or public.is_company_super_admin(company_id)
  );

create policy drivers_update_authorized
  on public.drivers
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'drivers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'drivers:update')
    or public.is_company_super_admin(company_id)
  );

create policy drivers_delete_authorized
  on public.drivers
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'drivers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- driver_history
-- ---------------------------------------------------------------------------

create policy driver_history_select_authorized
  on public.driver_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'drivers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy driver_history_insert_system
  on public.driver_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- driver_documents
-- ---------------------------------------------------------------------------

create policy driver_documents_select_authorized
  on public.driver_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'drivers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy driver_documents_insert_authorized
  on public.driver_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'drivers:update')
    or public.is_company_super_admin(company_id)
  );

create policy driver_documents_update_authorized
  on public.driver_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'drivers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'drivers:update')
    or public.is_company_super_admin(company_id)
  );

create policy driver_documents_delete_authorized
  on public.driver_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'drivers:delete')
    or public.is_company_super_admin(company_id)
  );
