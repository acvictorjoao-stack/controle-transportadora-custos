-- FleetControl Sprint 9 — Schema grants (Supabase roles)

grant usage on schema public to postgres, anon, authenticated, service_role;

grant all on all tables in schema public to postgres, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;

grant execute on all functions in schema public to authenticated, service_role;
