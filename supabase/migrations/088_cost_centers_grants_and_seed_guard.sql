-- Fix: permission denied for table cost_centers on DRE / rentabilidade.
-- Reafirma GRANTs (tabelas criadas após 014 não herdam privileges) e endurece
-- o seed SECURITY DEFINER. RLS SELECT permanece em financeiro:read — sem
-- afrouxar políticas nem desabilitar RLS.

grant select, insert, update, delete on public.cost_centers to authenticated;
grant all on public.cost_centers to service_role;

-- Seed: bloqueia usuários autenticados fora da empresa; permite contexto
-- de sistema (auth.uid() null) para provisionamento e migrations.
create or replace function public.seed_cost_centers_for_company(
  p_company_id uuid,
  p_created_by uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null
    and not (
      public.is_company_member(p_company_id)
      or public.is_company_super_admin(p_company_id)
    ) then
    raise exception 'not authorized to seed cost centers for this company'
      using errcode = '42501';
  end if;

  insert into public.cost_centers (
    company_id, code, name, description, is_system, created_by, updated_by
  )
  select
    p_company_id,
    v.code,
    v.name,
    v.description,
    true,
    p_created_by,
    p_created_by
  from (
    values
      ('OPERACIONAL', 'Operacional', 'Custos da operação: combustível, manutenção, pneus, pedágio, multas'),
      ('ADMINISTRATIVO', 'Administrativo', 'Despesas administrativas: energia, internet, aluguel, licenças'),
      ('COMERCIAL', 'Comercial', 'Custos comerciais e de relacionamento com clientes'),
      ('RH', 'RH', 'Pessoas: salários administrativos, benefícios, treinamentos'),
      ('TI', 'TI', 'Tecnologia: softwares, infraestrutura, suporte')
  ) as v(code, name, description)
  where not exists (
    select 1
    from public.cost_centers cc
    where cc.company_id = p_company_id
      and upper(cc.code) = v.code
      and cc.deleted_at is null
  );
end;
$$;

comment on function public.seed_cost_centers_for_company(uuid, uuid) is
  'Seeds default organizational cost centers for a company (membership required when called as authenticated user)';

grant execute on function public.seed_cost_centers_for_company(uuid, uuid) to authenticated;
