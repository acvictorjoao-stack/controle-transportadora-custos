-- Auditoria da exclusão administrativa de operadores do Portal Master.
-- Não altera RLS, policies, roles nem dados.

alter type public.portal_audit_action add value if not exists 'user_delete';
