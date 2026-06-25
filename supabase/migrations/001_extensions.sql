-- FleetControl Sprint 9 — Extensions
-- PostgreSQL 15+ / Supabase

create extension if not exists "pgcrypto" with schema extensions;

comment on extension "pgcrypto" is 'UUID generation (gen_random_uuid) and crypto utilities';
