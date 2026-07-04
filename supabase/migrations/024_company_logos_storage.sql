-- FleetControl Sprint 16 — Supabase Storage for company logos

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Members with companies:write may upload/update logos in their company folder
create policy company_logos_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'companies:write'
    )
  );

create policy company_logos_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'companies:write'
    )
  );

create policy company_logos_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'companies:write'
    )
  );

-- Public read (bucket is public)
create policy company_logos_select
  on storage.objects
  for select
  to public
  using (bucket_id = 'company-logos');
