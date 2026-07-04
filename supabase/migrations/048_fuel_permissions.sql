-- FleetControl Sprint 20 — Fuel RBAC permissions

insert into public.permissions (code, resource, action, description)
values
  ('fuel:read',   'fuel', 'read',   'View fleet fuel records'),
  ('fuel:create', 'fuel', 'create', 'Create fleet fuel records'),
  ('fuel:update', 'fuel', 'update', 'Update fleet fuel records'),
  ('fuel:delete', 'fuel', 'delete', 'Delete fleet fuel records')
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
  and p.code in ('fuel:read', 'fuel:create', 'fuel:update', 'fuel:delete')
  and (
    r.name in ('Super Admin', 'Admin')
    or (r.name = 'Manager' and p.code in ('fuel:read', 'fuel:create', 'fuel:update'))
    or (r.name = 'Operator' and p.code = 'fuel:read')
  )
on conflict do nothing;

-- Backfill complete. Canonical seed_default_roles_for_company is defined in 060_schema_consistency.sql.
