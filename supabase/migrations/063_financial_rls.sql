-- FleetControl Sprint 23 — Row Level Security for financial module

-- ---------------------------------------------------------------------------
-- financial_categories
-- ---------------------------------------------------------------------------

create policy financial_categories_select_authorized
  on public.financial_categories
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy financial_categories_insert_authorized
  on public.financial_categories
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:create')
    or public.is_company_super_admin(company_id)
  );

create policy financial_categories_update_authorized
  on public.financial_categories
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

create policy financial_categories_delete_authorized
  on public.financial_categories
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- financial_cost_centers
-- ---------------------------------------------------------------------------

create policy financial_cost_centers_select_authorized
  on public.financial_cost_centers
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy financial_cost_centers_insert_authorized
  on public.financial_cost_centers
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:create')
    or public.is_company_super_admin(company_id)
  );

create policy financial_cost_centers_update_authorized
  on public.financial_cost_centers
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

create policy financial_cost_centers_delete_authorized
  on public.financial_cost_centers
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- financial_entries
-- ---------------------------------------------------------------------------

create policy financial_entries_select_authorized
  on public.financial_entries
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy financial_entries_insert_authorized
  on public.financial_entries
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:create')
    or public.is_company_super_admin(company_id)
  );

create policy financial_entries_update_authorized
  on public.financial_entries
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

create policy financial_entries_delete_authorized
  on public.financial_entries
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- financial_history
-- ---------------------------------------------------------------------------

create policy financial_history_select_authorized
  on public.financial_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy financial_history_insert_system
  on public.financial_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));

-- ---------------------------------------------------------------------------
-- financial_documents
-- ---------------------------------------------------------------------------

create policy financial_documents_select_authorized
  on public.financial_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'financeiro:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy financial_documents_insert_authorized
  on public.financial_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

create policy financial_documents_update_authorized
  on public.financial_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'financeiro:update')
    or public.is_company_super_admin(company_id)
  );

create policy financial_documents_delete_authorized
  on public.financial_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'financeiro:delete')
    or public.is_company_super_admin(company_id)
  );
