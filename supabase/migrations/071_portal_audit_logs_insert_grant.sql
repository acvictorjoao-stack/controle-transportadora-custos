-- portal_audit_logs was created in 034 (after 014_grants blanket grants).
-- logPortalAudit() inserts via service_role; without this grant inserts fail with
-- "permission denied for table portal_audit_logs".

grant insert on public.portal_audit_logs to service_role;
