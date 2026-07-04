-- FleetControl — VI session module: Row Level Security for vision_providers

create policy vision_providers_select_authorized
  on public.vision_providers
  for select
  to authenticated
  using (
    public.is_company_member(company_id)
    and (
      public.has_company_permission(company_id, 'vision_providers:read')
      or public.is_company_super_admin(company_id)
    )
  );

create policy vision_providers_insert_authorized
  on public.vision_providers
  for insert
  to authenticated
  with check (
    public.has_company_permission(company_id, 'vision_providers:create')
    or public.is_company_super_admin(company_id)
  );

create policy vision_providers_update_authorized
  on public.vision_providers
  for update
  to authenticated
  using (
    public.has_company_permission(company_id, 'vision_providers:update')
    or public.is_company_super_admin(company_id)
  )
  with check (
    public.has_company_permission(company_id, 'vision_providers:update')
    or public.is_company_super_admin(company_id)
  );

create policy vision_providers_delete_authorized
  on public.vision_providers
  for delete
  to authenticated
  using (
    public.has_company_permission(company_id, 'vision_providers:delete')
    or public.is_company_super_admin(company_id)
  );
