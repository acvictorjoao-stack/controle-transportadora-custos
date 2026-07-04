-- FleetControl Sprint 21 — Row Level Security for maintenance module

-- ---------------------------------------------------------------------------
-- maintenance_records
-- ---------------------------------------------------------------------------

create policy maintenance_records_select_authorized
  on public.maintenance_records
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'maintenance:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy maintenance_records_insert_authorized
  on public.maintenance_records
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'maintenance:create')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_records_update_authorized
  on public.maintenance_records
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_records_delete_authorized
  on public.maintenance_records
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- maintenance_history
-- ---------------------------------------------------------------------------

create policy maintenance_history_select_authorized
  on public.maintenance_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'maintenance:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy maintenance_history_insert_system
  on public.maintenance_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- maintenance_documents
-- ---------------------------------------------------------------------------

create policy maintenance_documents_select_authorized
  on public.maintenance_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'maintenance:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy maintenance_documents_insert_authorized
  on public.maintenance_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_documents_update_authorized
  on public.maintenance_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_documents_delete_authorized
  on public.maintenance_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- maintenance_parts
-- ---------------------------------------------------------------------------

create policy maintenance_parts_select_authorized
  on public.maintenance_parts
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'maintenance:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy maintenance_parts_insert_authorized
  on public.maintenance_parts
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_parts_update_authorized
  on public.maintenance_parts
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_parts_delete_authorized
  on public.maintenance_parts
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- maintenance_services
-- ---------------------------------------------------------------------------

create policy maintenance_services_select_authorized
  on public.maintenance_services
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'maintenance:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy maintenance_services_insert_authorized
  on public.maintenance_services
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_services_update_authorized
  on public.maintenance_services
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_services_delete_authorized
  on public.maintenance_services
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- maintenance_schedules
-- ---------------------------------------------------------------------------

create policy maintenance_schedules_select_authorized
  on public.maintenance_schedules
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'maintenance:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy maintenance_schedules_insert_authorized
  on public.maintenance_schedules
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'maintenance:create')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_schedules_update_authorized
  on public.maintenance_schedules
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'maintenance:update')
    or public.is_company_super_admin(company_id)
  );

create policy maintenance_schedules_delete_authorized
  on public.maintenance_schedules
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'maintenance:delete')
    or public.is_company_super_admin(company_id)
  );
