-- FleetControl Sprint 17 — Vehicle RBAC permissions

insert into public.permissions (code, resource, action, description)
values
  ('vehicles:read',   'vehicles', 'read',   'View fleet vehicles'),
  ('vehicles:create', 'vehicles', 'create', 'Create fleet vehicles'),
  ('vehicles:update', 'vehicles', 'update', 'Update fleet vehicles'),
  ('vehicles:delete', 'vehicles', 'delete', 'Delete fleet vehicles')
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
  and p.code in ('vehicles:read', 'vehicles:create', 'vehicles:update', 'vehicles:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('vehicles:read', 'vehicles:create', 'vehicles:update'))
    or (r.name = 'Operator' and p.code = 'vehicles:read')
  )
on conflict do nothing;

-- Backfill complete. Canonical seed_default_roles_for_company is defined in 060_schema_consistency.sql.
