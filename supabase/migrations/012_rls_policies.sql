-- FleetControl Sprint 9 — Row Level Security policies (Organization module)

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------

create policy companies_insert_authenticated
  on public.companies
  for insert
  to authenticated
  with check (true);

create policy companies_select_members
  on public.companies
  for select
  to authenticated
  using (public.is_company_member(id));

-- Bootstrap: read company before first member exists (onboarding)
create policy companies_select_bootstrap
  on public.companies
  for select
  to authenticated
  using (not public.company_has_active_members(id));

create policy companies_update_authorized
  on public.companies
  for update
  to authenticated
  using (
    public.is_company_super_admin(id)
    or public.has_company_permission(id, 'companies:write')
  )
  with check (
    public.is_company_super_admin(id)
    or public.has_company_permission(id, 'companies:write')
  );

-- Soft delete via UPDATE (set deleted_at)
create policy companies_soft_delete_authorized
  on public.companies
  for delete
  to authenticated
  using (public.is_company_super_admin(id));

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_company_peers
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm_self
      inner join public.company_members cm_peer
        on cm_peer.company_id = cm_self.company_id
        and cm_peer.profile_id = profiles.id
        and cm_peer.deleted_at is null
        and cm_peer.status = 'active'
      where cm_self.profile_id = auth.uid()
        and cm_self.deleted_at is null
        and cm_self.status = 'active'
    )
  );

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_update_authorized
  on public.profiles
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.company_members cm
      where cm.profile_id = profiles.id
        and cm.deleted_at is null
        and (
          public.has_company_permission(cm.company_id, 'profiles:write')
          or public.is_company_super_admin(cm.company_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.company_members cm
      where cm.profile_id = profiles.id
        and cm.deleted_at is null
        and (
          public.has_company_permission(cm.company_id, 'profiles:write')
          or public.is_company_super_admin(cm.company_id)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- permissions (global read-only for authenticated users)
-- ---------------------------------------------------------------------------

create policy permissions_select_authenticated
  on public.permissions
  for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- roles
-- ---------------------------------------------------------------------------

create policy roles_select_members
  on public.roles
  for select
  to authenticated
  using (public.is_company_member(company_id));

-- Bootstrap: read auto-seeded roles before first member exists (onboarding)
create policy roles_select_bootstrap
  on public.roles
  for select
  to authenticated
  using (not public.company_has_active_members(company_id));

create policy roles_insert_authorized
  on public.roles
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'roles:write')
    or public.is_company_super_admin(company_id)
  );

create policy roles_update_authorized
  on public.roles
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'roles:write')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'roles:write')
    or public.is_company_super_admin(company_id)
  );

create policy roles_delete_authorized
  on public.roles
  for delete
  to authenticated
  using (
    is_system = false
    and (
      public.has_company_permission(company_id, 'roles:write')
      or public.is_company_super_admin(company_id)
    )
  );

-- ---------------------------------------------------------------------------
-- branches
-- ---------------------------------------------------------------------------

create policy branches_select_members
  on public.branches
  for select
  to authenticated
  using (public.is_company_member(company_id));

-- Bootstrap: read HQ branch before first member exists (onboarding)
create policy branches_select_bootstrap
  on public.branches
  for select
  to authenticated
  using (not public.company_has_active_members(company_id));

create policy branches_insert_authorized
  on public.branches
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'branches:write')
    or public.is_company_super_admin(company_id)
  );

create policy branches_update_authorized
  on public.branches
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'branches:write')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'branches:write')
    or public.is_company_super_admin(company_id)
  );

create policy branches_delete_authorized
  on public.branches
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'branches:write')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------

create policy role_permissions_select_members
  on public.role_permissions
  for select
  to authenticated
  using (public.is_company_member(company_id));

create policy role_permissions_insert_authorized
  on public.role_permissions
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'roles:write')
    or public.is_company_super_admin(company_id)
  );

create policy role_permissions_delete_authorized
  on public.role_permissions
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'roles:write')
    or public.is_company_super_admin(company_id)
  );

-- ---------------------------------------------------------------------------
-- company_members
-- ---------------------------------------------------------------------------

create policy company_members_select_members
  on public.company_members
  for select
  to authenticated
  using (public.is_company_member(company_id));

create policy company_members_insert_authorized
  on public.company_members
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'members:write')
    or public.has_company_permission(company_id, 'members:invite')
    or public.is_company_super_admin(company_id)
    -- Bootstrap: creator becomes first member with Super Admin role
    or (
      profile_id = auth.uid()
      and not public.company_has_active_members(company_id)
      and exists (
        select 1
        from public.roles r
        where r.id = company_members.role_id
          and r.company_id = company_members.company_id
          and r.name = 'Super Admin'
          and r.is_system = true
          and r.deleted_at is null
      )
    )
  );

create policy company_members_update_authorized
  on public.company_members
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'members:write')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'members:write')
    or public.is_company_super_admin(company_id)
  );

create policy company_members_delete_authorized
  on public.company_members
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'members:write')
    or public.is_company_super_admin(company_id)
  );
