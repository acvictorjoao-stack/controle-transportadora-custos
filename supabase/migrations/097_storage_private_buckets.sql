-- FleetControl — Storage privado (checklist final #2)
-- Os buckets empresariais eram public: /storage/v1/object/public/{bucket}/{path}
-- não passa por RLS, então quem tivesse a URL baixava o arquivo sem sessão.
-- A aplicação passa a gravar só o path e a servir os arquivos por URL assinada
-- de curta duração (rota /api/storage), pedida com a sessão do usuário.
-- Não altera nem remove objetos: muda a configuração dos buckets e as policies.

-- ---------------------------------------------------------------------------
-- 1. Buckets privados
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false
where id in (
  'company-logos',
  'vehicle-files',
  'driver-files',
  'trip-files',
  'fuel-files',
  'maintenance-files',
  'tire-files',
  'financial-files',
  'customer-files'
);

-- ---------------------------------------------------------------------------
-- 2. Nenhuma policy de storage.objects aberta a public/anon nesses buckets
-- ---------------------------------------------------------------------------
-- As *_select "to public" das migrations 024–070 já foram trocadas em 096;
-- isto remove também policies equivalentes criadas fora das migrations
-- (dashboard), qualquer que seja o nome.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and roles && array['public', 'anon']::name[]
      and concat_ws(' ', qual, with_check)
        ~ '(company-logos|vehicle-files|driver-files|trip-files|fuel-files|maintenance-files|tire-files|financial-files|customer-files)'
  loop
    execute format('drop policy %I on storage.objects', v_policy.policyname);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Leitura (SELECT) — download, URL assinada e listagem
-- ---------------------------------------------------------------------------
-- Reafirma as regras de 096: empresa do primeiro segmento do path + permissão
-- de leitura do módulo (logo: qualquer membro ativo da empresa). Escrita e
-- remoção seguem com as policies *_insert/_update/_delete originais
-- (<módulo>:update / companies:write na pasta da empresa).

drop policy if exists company_logos_select on storage.objects;
create policy company_logos_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_company_member(public.storage_object_company_id(name))
  );

drop policy if exists vehicle_files_select on storage.objects;
create policy vehicle_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'vehicle-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'vehicles:read')
  );

drop policy if exists driver_files_select on storage.objects;
create policy driver_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'driver-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'drivers:read')
  );

drop policy if exists trip_files_select on storage.objects;
create policy trip_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'trip-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'trips:read')
  );

drop policy if exists fuel_files_select on storage.objects;
create policy fuel_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'fuel-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'fuel:read')
  );

drop policy if exists maintenance_files_select on storage.objects;
create policy maintenance_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'maintenance-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'maintenance:read')
  );

drop policy if exists tire_files_select on storage.objects;
create policy tire_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'tire-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'tires:read')
  );

drop policy if exists financial_files_select on storage.objects;
create policy financial_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'financial-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'financeiro:read')
  );

drop policy if exists customer_files_select on storage.objects;
create policy customer_files_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'customer-files'
    and public.has_company_permission(public.storage_object_company_id(name), 'customers:read')
  );
