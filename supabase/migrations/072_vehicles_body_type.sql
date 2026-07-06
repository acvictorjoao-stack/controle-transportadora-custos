-- FleetControl Sprint 24.4.6 — Implemento / Carroceria em veículos

alter table public.vehicles
  add column if not exists body_type text;

comment on column public.vehicles.body_type is
  'Implemento ou carroceria do veículo (baú, sider, graneleiro, etc.)';
