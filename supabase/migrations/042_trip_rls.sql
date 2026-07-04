-- FleetControl Sprint 19 — Row Level Security for trips module

-- ---------------------------------------------------------------------------
-- trips
-- ---------------------------------------------------------------------------

create policy trips_select_authorized
  on public.trips
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trips_insert_authorized
  on public.trips
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'trips:create')
    or public.is_company_super_admin(company_id)
  );

create policy trips_update_authorized
  on public.trips
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trips_delete_authorized
  on public.trips
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- trip_history
-- ---------------------------------------------------------------------------

create policy trip_history_select_authorized
  on public.trip_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trip_history_insert_system
  on public.trip_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- trip_documents
-- ---------------------------------------------------------------------------

create policy trip_documents_select_authorized
  on public.trip_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trip_documents_insert_authorized
  on public.trip_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_documents_update_authorized
  on public.trip_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_documents_delete_authorized
  on public.trip_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- trip_occurrences
-- ---------------------------------------------------------------------------

create policy trip_occurrences_select_authorized
  on public.trip_occurrences
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trip_occurrences_insert_authorized
  on public.trip_occurrences
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_occurrences_update_authorized
  on public.trip_occurrences
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_occurrences_delete_authorized
  on public.trip_occurrences
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- trip_checklists
-- ---------------------------------------------------------------------------

create policy trip_checklists_select_authorized
  on public.trip_checklists
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trip_checklists_insert_authorized
  on public.trip_checklists
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_checklists_update_authorized
  on public.trip_checklists
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_checklists_delete_authorized
  on public.trip_checklists
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- trip_expenses
-- ---------------------------------------------------------------------------

create policy trip_expenses_select_authorized
  on public.trip_expenses
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trip_expenses_insert_authorized
  on public.trip_expenses
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_expenses_update_authorized
  on public.trip_expenses
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_expenses_delete_authorized
  on public.trip_expenses
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- trip_stops
-- ---------------------------------------------------------------------------

create policy trip_stops_select_authorized
  on public.trip_stops
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trip_stops_insert_authorized
  on public.trip_stops
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_stops_update_authorized
  on public.trip_stops
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_stops_delete_authorized
  on public.trip_stops
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- trip_locations
-- ---------------------------------------------------------------------------

create policy trip_locations_select_authorized
  on public.trip_locations
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'trips:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy trip_locations_insert_authorized
  on public.trip_locations
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_locations_update_authorized
  on public.trip_locations
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'trips:update')
    or public.is_company_super_admin(company_id)
  );

create policy trip_locations_delete_authorized
  on public.trip_locations
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'trips:delete')
    or public.is_company_super_admin(company_id)
  );
