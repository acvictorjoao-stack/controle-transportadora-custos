-- FleetControl Sprint 24 — Row Level Security for customers module

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

create policy customers_select_authorized
  on public.customers
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'customers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy customers_insert_authorized
  on public.customers
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'customers:create')
    or public.is_company_super_admin(company_id)
  );

create policy customers_update_authorized
  on public.customers
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  );

create policy customers_delete_authorized
  on public.customers
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- customer_addresses
-- ---------------------------------------------------------------------------

create policy customer_addresses_select_authorized
  on public.customer_addresses
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'customers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy customer_addresses_insert_authorized
  on public.customer_addresses
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'customers:create')
    or public.is_company_super_admin(company_id)
  );

create policy customer_addresses_update_authorized
  on public.customer_addresses
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  );

create policy customer_addresses_delete_authorized
  on public.customer_addresses
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- customer_contacts
-- ---------------------------------------------------------------------------

create policy customer_contacts_select_authorized
  on public.customer_contacts
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'customers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy customer_contacts_insert_authorized
  on public.customer_contacts
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'customers:create')
    or public.is_company_super_admin(company_id)
  );

create policy customer_contacts_update_authorized
  on public.customer_contacts
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  );

create policy customer_contacts_delete_authorized
  on public.customer_contacts
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- customer_contracts
-- ---------------------------------------------------------------------------

create policy customer_contracts_select_authorized
  on public.customer_contracts
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'customers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy customer_contracts_insert_authorized
  on public.customer_contracts
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'customers:create')
    or public.is_company_super_admin(company_id)
  );

create policy customer_contracts_update_authorized
  on public.customer_contracts
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  );

create policy customer_contracts_delete_authorized
  on public.customer_contracts
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- customer_contract_items
-- ---------------------------------------------------------------------------

create policy customer_contract_items_select_authorized
  on public.customer_contract_items
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'customers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy customer_contract_items_insert_authorized
  on public.customer_contract_items
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'customers:create')
    or public.is_company_super_admin(company_id)
  );

create policy customer_contract_items_update_authorized
  on public.customer_contract_items
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  );

create policy customer_contract_items_delete_authorized
  on public.customer_contract_items
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- customer_documents
-- ---------------------------------------------------------------------------

create policy customer_documents_select_authorized
  on public.customer_documents
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'customers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy customer_documents_insert_authorized
  on public.customer_documents
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  );

create policy customer_documents_update_authorized
  on public.customer_documents
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'customers:update')
    or public.is_company_super_admin(company_id)
  );

create policy customer_documents_delete_authorized
  on public.customer_documents
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'customers:delete')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- customer_history
-- ---------------------------------------------------------------------------

create policy customer_history_select_authorized
  on public.customer_history
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'customers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy customer_history_insert_system
  on public.customer_history
  for insert
  to authenticated
  with check (public.is_company_member(company_id));
