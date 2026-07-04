-- FleetControl Sprint 17 — Row Level Security for vehicles module

-- ---------------------------------------------------------------------------
-- vehicles
-- ---------------------------------------------------------------------------

create policy vehicles_select_authorized
  on public.vehicles
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'vehicles:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy vehicles_insert_authorized
  on public.vehicles
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'vehicles:create')
    or public.is_company_super_admin(company_id)
  );

create policy vehicles_update_authorized
  on public.vehicles
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'vehicles:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'vehicles:update')
    or public.is_company_super_admin(company_id)
  );

create policy vehicles_delete_authorized
  on public.vehicles
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'vehicles:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- vehicle_history
-- ---------------------------------------------------------------------------

create policy vehicle_history_select_authorized
  on public.vehicle_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'vehicles:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy vehicle_history_insert_system
  on public.vehicle_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- vehicle_documents
-- ---------------------------------------------------------------------------

create policy vehicle_documents_select_authorized
  on public.vehicle_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'vehicles:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy vehicle_documents_insert_authorized
  on public.vehicle_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'vehicles:update')
    or public.is_company_super_admin(company_id)
  );

create policy vehicle_documents_update_authorized
  on public.vehicle_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'vehicles:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'vehicles:update')
    or public.is_company_super_admin(company_id)
  );

create policy vehicle_documents_delete_authorized
  on public.vehicle_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'vehicles:delete')
    or public.is_company_super_admin(company_id)
  );
