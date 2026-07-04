-- FleetControl Sprint 20 — Row Level Security for fuel module

-- ---------------------------------------------------------------------------
-- fuel_records
-- ---------------------------------------------------------------------------

create policy fuel_records_select_authorized
  on public.fuel_records
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'fuel:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy fuel_records_insert_authorized
  on public.fuel_records
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'fuel:create')
    or public.is_company_super_admin(company_id)
  );

create policy fuel_records_update_authorized
  on public.fuel_records
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'fuel:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'fuel:update')
    or public.is_company_super_admin(company_id)
  );

create policy fuel_records_delete_authorized
  on public.fuel_records
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'fuel:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- fuel_history
-- ---------------------------------------------------------------------------

create policy fuel_history_select_authorized
  on public.fuel_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'fuel:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy fuel_history_insert_system
  on public.fuel_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- fuel_documents
-- ---------------------------------------------------------------------------

create policy fuel_documents_select_authorized
  on public.fuel_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'fuel:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy fuel_documents_insert_authorized
  on public.fuel_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'fuel:update')
    or public.is_company_super_admin(company_id)
  );

create policy fuel_documents_update_authorized
  on public.fuel_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'fuel:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'fuel:update')
    or public.is_company_super_admin(company_id)
  );

create policy fuel_documents_delete_authorized
  on public.fuel_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'fuel:delete')
    or public.is_company_super_admin(company_id)
  );
