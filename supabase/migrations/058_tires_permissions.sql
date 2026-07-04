-- FleetControl Sprint 22 — Tires RBAC permissions

insert into public.permissions (code, resource, action, description)
values
  ('tires:read',   'tires', 'read',   'View fleet tire records'),
  ('tires:create', 'tires', 'create', 'Create fleet tire records'),
  ('tires:update', 'tires', 'update', 'Update fleet tire records'),
  ('tires:delete', 'tires', 'delete', 'Delete fleet tire records')
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
  and p.code in ('tires:read', 'tires:create', 'tires:update', 'tires:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('tires:read', 'tires:create', 'tires:update'))
    or (r.name = 'Operator' and p.code = 'tires:read')
  )
on conflict do nothing;

-- Backfill complete. Canonical seed_default_roles_for_company is defined in 060_schema_consistency.sql.
