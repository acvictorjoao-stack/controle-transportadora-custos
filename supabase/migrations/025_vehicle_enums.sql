-- FleetControl Sprint 17 — Vehicle ENUM types

create type public.vehicle_asset_status as enum (
  'active',
  'maintenance',
  'inactive',
  'sold'
);

comment on type public.vehicle_asset_status is
  'Operational status of a fleet vehicle (active, maintenance, inactive, sold)';

create type public.vehicle_fuel_type as enum (
  'diesel',
  'gasoline',
  'ethanol',
  'flex',
  'gnv',
  'electric',
  'hybrid',
  'other'
);

comment on type public.vehicle_fuel_type is 'Primary fuel type for a vehicle';
