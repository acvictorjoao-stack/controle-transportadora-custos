-- FleetControl Sprint 22 — Row Level Security for tires module

-- ---------------------------------------------------------------------------
-- tires
-- ---------------------------------------------------------------------------

create policy tires_select_authorized
  on public.tires
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'tires:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy tires_insert_authorized
  on public.tires
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'tires:create')
    or public.is_company_super_admin(company_id)
  );

create policy tires_update_authorized
  on public.tires
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tires_delete_authorized
  on public.tires
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- tire_history
-- ---------------------------------------------------------------------------

create policy tire_history_select_authorized
  on public.tire_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'tires:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy tire_history_insert_system
  on public.tire_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- tire_movements
-- ---------------------------------------------------------------------------

create policy tire_movements_select_authorized
  on public.tire_movements
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'tires:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy tire_movements_insert_authorized
  on public.tire_movements
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_movements_update_authorized
  on public.tire_movements
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_movements_delete_authorized
  on public.tire_movements
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- tire_inspections
-- ---------------------------------------------------------------------------

create policy tire_inspections_select_authorized
  on public.tire_inspections
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'tires:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy tire_inspections_insert_authorized
  on public.tire_inspections
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_inspections_update_authorized
  on public.tire_inspections
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_inspections_delete_authorized
  on public.tire_inspections
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- tire_recaps
-- ---------------------------------------------------------------------------

create policy tire_recaps_select_authorized
  on public.tire_recaps
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'tires:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy tire_recaps_insert_authorized
  on public.tire_recaps
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_recaps_update_authorized
  on public.tire_recaps
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_recaps_delete_authorized
  on public.tire_recaps
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- tire_documents
-- ---------------------------------------------------------------------------

create policy tire_documents_select_authorized
  on public.tire_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'tires:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy tire_documents_insert_authorized
  on public.tire_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_documents_update_authorized
  on public.tire_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'tires:update')
    or public.is_company_super_admin(company_id)
  );

create policy tire_documents_delete_authorized
  on public.tire_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'tires:delete')
    or public.is_company_super_admin(company_id)
  );
