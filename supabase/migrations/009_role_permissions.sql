-- FleetControl Sprint 9 — role_permissions (N:N roles ↔ permissions)

create table public.role_permissions (
  role_id       uuid not null references public.roles (id) on delete cascade,
  permission_id uuid not null references public.permissions (id) on delete restrict,
  company_id    uuid not null references public.companies (id) on delete cascade,
  created_at    timestamptz not null default timezone('utc', now()),
  created_by    uuid references public.profiles (id) on delete set null,

  primary key (role_id, permission_id)
);

create index idx_role_permissions_company_id
  on public.role_permissions (company_id);

create index idx_role_permissions_permission_id
  on public.role_permissions (permission_id);

create index idx_role_permissions_role_id
  on public.role_permissions (role_id);

alter table public.role_permissions enable row level security;

comment on table public.role_permissions is 'Immutable junction — maps roles to global permissions per company';
