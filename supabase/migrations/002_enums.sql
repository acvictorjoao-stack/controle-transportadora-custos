-- FleetControl Sprint 9 — ENUM types (Organization module)

create type public.entity_status as enum (
  'active',
  'inactive',
  'blocked',
  'archived'
);

comment on type public.entity_status is 'Lifecycle status for tenant-scoped entities';
