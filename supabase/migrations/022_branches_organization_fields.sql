-- FleetControl Sprint 16 — extended branch fields

alter table public.branches
  add column if not exists phone text,
  add column if not exists responsible_name text;

comment on column public.branches.responsible_name is 'Nome do responsável pela filial';
