-- FleetControl Sprint 22 — tire enums

create type public.tire_status as enum (
  'in_stock',
  'installed',
  'in_retread',
  'discarded',
  'warranty'
);

comment on type public.tire_status is
  'Operational status of a tire (estoque, instalado, recapado, descartado, garantia)';

create type public.tire_position as enum (
  'front_left',
  'front_right',
  'rear_left_outer',
  'rear_left_inner',
  'rear_right_outer',
  'rear_right_inner',
  'spare',
  'other'
);

comment on type public.tire_position is
  'Wheel position on the vehicle';

create type public.tire_movement_type as enum (
  'install',
  'remove',
  'position_change',
  'rotation'
);

comment on type public.tire_movement_type is
  'Type of tire movement (instalação, remoção, troca de posição, rodízio)';

create type public.tire_document_type as enum (
  'invoice',
  'warranty',
  'photo',
  'report',
  'other'
);

comment on type public.tire_document_type is
  'Types of documents attached to tires (NF, garantia, fotos, laudos, outros)';

create type public.tire_wear_level as enum (
  'good',
  'warning',
  'critical'
);

comment on type public.tire_wear_level is
  'Wear assessment level from inspections';
