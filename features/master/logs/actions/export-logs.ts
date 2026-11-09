'use server';

import {PORTAL_ACCESS_DENIED, guardPortalOwner} from '@/lib/auth/guards';
import {createClient} from '@/supabase/server';

import {auditLogsToCsv, exportAuditLogs} from '../queries/audit-logs';
import type {AuditActionFilter} from '../queries/audit-logs';
import {todayCivilDate} from '@/lib/formatting/date';

export interface ExportAuditLogsInput {
  search?: string;
  action?: AuditActionFilter;
  dateFrom?: string;
  dateTo?: string;
}

export async function exportAuditLogsAction(
  input: ExportAuditLogsInput = {},
): Promise<{success: true; csv: string; filename: string} | {success: false; error: string}> {
  if (!(await guardPortalOwner())) {
    return {success: false, error: PORTAL_ACCESS_DENIED};
  }

  try {
    const supabase = await createClient();
    const items = await exportAuditLogs(supabase, input);
    const csv = auditLogsToCsv(items);
    const date = todayCivilDate();

    return {
      success: true,
      csv,
      filename: `audit-logs-${date}.csv`,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Erro ao exportar logs.',
    };
  }
}
