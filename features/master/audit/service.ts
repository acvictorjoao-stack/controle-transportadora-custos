import {createAdminClient} from '@/supabase/server/admin';
import type {Json} from '@/supabase/types/database';

import type {LogPortalAuditInput} from './types';

/**
 * Registra evento de auditoria via service_role.
 * INSERT é permitido por GRANT em service_role; leitura permanece RLS (OWNER).
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
      throw new Error(error.message);
    }
  } catch {
    // Auditoria não deve interromper a ação principal do portal.
  }
}
