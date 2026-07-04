-- FleetControl Sprint 19 — Trip RBAC permissions

insert into public.permissions (code, resource, action, description)
values
  ('trips:read',   'trips', 'read',   'View fleet trips'),
  ('trips:create', 'trips', 'create', 'Create fleet trips'),
  ('trips:update', 'trips', 'update', 'Update fleet trips'),
  ('trips:delete', 'trips', 'delete', 'Delete fleet trips')
on conflict (code) do update
set
  resource = excluded.resource,
  action = excluded.action,
  description = excluded.description,
  updated_at = timezone('utc', now());

-- Backfill permissions for existing company roles
insert into public.role_permissions (role_id, permission_id, company_id, created_by)
select r.id, p.id, r.company_id, null
from public.roles r
cross join public.permissions p
where r.deleted_at is null
  and p.code in ('trips:read', 'trips:create', 'trips:update', 'trips:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('trips:read', 'trips:create', 'trips:update'))
    or (r.name = 'Operator' and p.code = 'trips:read')
  )
on conflict do nothing;

-- Backfill complete. Canonical seed_default_roles_for_company is defined in 060_schema_consistency.sql.
