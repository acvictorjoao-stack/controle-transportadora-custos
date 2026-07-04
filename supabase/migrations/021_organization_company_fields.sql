-- FleetControl Sprint 16 — extended company profile fields

alter table public.companies
  add column if not exists state_registration text,
  add column if not exists municipal_registration text,
  add column if not exists whatsapp text,
  add column if not exists website text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_neighborhood text,
  add column if not exists address_country text default 'Brasil';

comment on column public.companies.state_registration is 'Inscrição estadual (IE)';
comment on column public.companies.municipal_registration is 'Inscrição municipal (IM)';
comment on column public.companies.whatsapp is 'WhatsApp comercial';
comment on column public.companies.website is 'Site institucional';
