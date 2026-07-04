-- FleetControl Sprint 18 — Supabase Storage for driver files

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-files',
  'driver-files',
  true,
  10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {company_id}/{driver_id}/{filename}
create policy driver_files_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'driver-files'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'drivers:update'
    )
  );

create policy driver_files_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'driver-files'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'drivers:update'
    )
  );

create policy driver_files_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'driver-files'
    and (storage.foldername(name))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.has_company_permission(
      ((storage.foldername(name))[1])::uuid,
      'drivers:update'
    )
  );

create policy driver_files_select
  on storage.objects
  for select
  to public
  using (bucket_id = 'driver-files');
