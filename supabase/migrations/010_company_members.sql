-- FleetControl Sprint 9 — company_members (user ↔ company ↔ role)

create table public.company_members (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete restrict,
  profile_id         uuid not null references public.profiles (id) on delete cascade,
  role_id            uuid not null references public.roles (id) on delete restrict,
  default_branch_id  uuid references public.branches (id) on delete set null,
  invited_at         timestamptz,
  accepted_at        timestamptz,
  status             public.entity_status not null default 'active',
  notes              text,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),
  deleted_at         timestamptz,
  created_by         uuid references public.profiles (id) on delete set null,
  updated_by         uuid references public.profiles (id) on delete set null
);

create unique index idx_company_members_company_profile_active
  on public.company_members (company_id, profile_id)
  where deleted_at is null;

create index idx_company_members_profile_id_active
  on public.company_members (profile_id)
  where deleted_at is null;

create index idx_company_members_company_id_active
  on public.company_members (company_id)
  where deleted_at is null;

create index idx_company_members_role_id
  on public.company_members (role_id);

create trigger company_members_set_updated_at
  before update on public.company_members
  for each row
  execute function public.set_updated_at();

alter table public.company_members enable row level security;

comment on table public.company_members is 'Links authenticated users to companies with a role';
