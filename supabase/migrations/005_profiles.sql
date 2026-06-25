-- FleetControl Sprint 9 — profiles (1:1 with auth.users)

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  full_name      text not null,
  email          text not null,
  avatar_url     text,
  phone          text,
  preferences    jsonb not null default '{}'::jsonb,
  last_login_at  timestamptz,
  status         public.entity_status not null default 'active',
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),

  constraint profiles_full_name_not_empty check (length(trim(full_name)) > 0),
  constraint profiles_email_not_empty check (length(trim(email)) > 0),
  constraint profiles_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  constraint profiles_preferences_is_object check (jsonb_typeof(preferences) = 'object')
);

create unique index idx_profiles_email
  on public.profiles (email);

create index idx_profiles_status
  on public.profiles (status);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create profile on Supabase Auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, status)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    'active'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

alter table public.profiles enable row level security;

comment on table public.profiles is 'Application profile linked to Supabase Auth';
