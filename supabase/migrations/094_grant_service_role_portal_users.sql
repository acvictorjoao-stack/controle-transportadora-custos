-- portal_users was created in 015 (after 014 blanket grants).
-- removePortalUserAccess() deletes via service_role; without explicit grants
-- the operation fails with "permission denied for table portal_users".

grant select, delete on public.portal_users to service_role;
