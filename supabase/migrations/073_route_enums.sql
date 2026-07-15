-- FleetControl Sprint 25.1 — Route ENUM types

create type public.route_operational_status as enum (
  'active',
  'inactive'
);

comment on type public.route_operational_status is
  'Operational status of a route (active, inactive)';

create type public.route_type as enum (
  'delivery',
  'pickup',
  'transfer',
  'distribution',
  'other'
);

comment on type public.route_type is
  'Operational type of a route (delivery, pickup, transfer, distribution, other)';

create type public.route_document_type as enum (
  'document',
  'map',
  'other'
);

comment on type public.route_document_type is 'Route file/document classification';
