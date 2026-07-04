import {createAdminClient} from '@/supabase/server/admin';
import type {Json} from '@/supabase/types/database';

import type {LogPortalAuditInput} from './types';

/**
 * Registra evento de auditoria via service_role (bypass RLS).
 * Usado em Server Actions e fluxos de auth.
 */
export async function logPortalAudit(input: LogPortalAuditInput): Promise<void> {
  try {
    const admin = createAdminClient();

    const {error} = await admin.from('portal_audit_logs').insert({
      action: input.action,
      actor_profile_id: input.actorProfileId ?? null,
      actor_email: input.actorEmail ?? null,
      target_type: input.targetType ?? null,
      target_id: input.targetId ?? null,
      target_label: input.targetLabel ?? null,
      metadata: (input.metadata ?? {}) as Json,
      ip_address: input.ipAddress ?? null,
      user_agent: input.userAgent ?? null,
    });

    if (error) {
      console.error('[audit] Failed to log event:', error.message);
    }
  } catch (error) {
    console.error('[audit] Failed to log event:', error);
  }
}
