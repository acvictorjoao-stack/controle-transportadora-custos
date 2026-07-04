-- FleetControl Sprint 18 — Driver RBAC permissions

insert into public.permissions (code, resource, action, description)
values
  ('drivers:read',   'drivers', 'read',   'View fleet drivers'),
  ('drivers:create', 'drivers', 'create', 'Create fleet drivers'),
  ('drivers:update', 'drivers', 'update', 'Update fleet drivers'),
  ('drivers:delete', 'drivers', 'delete', 'Delete fleet drivers')
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
  and p.code in ('drivers:read', 'drivers:create', 'drivers:update', 'drivers:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('drivers:read', 'drivers:create', 'drivers:update'))
    or (r.name = 'Operator' and p.code = 'drivers:read')
  )
on conflict do nothing;

-- Backfill complete. Canonical seed_default_roles_for_company is defined in 060_schema_consistency.sql.
