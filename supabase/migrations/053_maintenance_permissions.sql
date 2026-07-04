-- FleetControl Sprint 21 — Maintenance RBAC permissions

insert into public.permissions (code, resource, action, description)
values
  ('maintenance:read',   'maintenance', 'read',   'View fleet maintenance records'),
  ('maintenance:create', 'maintenance', 'create', 'Create fleet maintenance records'),
  ('maintenance:update', 'maintenance', 'update', 'Update fleet maintenance records'),
  ('maintenance:delete', 'maintenance', 'delete', 'Delete fleet maintenance records')
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
  and p.code in ('maintenance:read', 'maintenance:create', 'maintenance:update', 'maintenance:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('maintenance:read', 'maintenance:create', 'maintenance:update'))
    or (r.name = 'Operator' and p.code = 'maintenance:read')
  )
on conflict do nothing;

-- Backfill complete. Canonical seed_default_roles_for_company is defined in 060_schema_consistency.sql.
