import {PageTemplate} from '@/components/layout/page-template';
import {Section} from '@/components/layout/section';
import {AuditLogsList} from '@/features/master/logs/components/audit-logs-list';
import {listAuditLogs} from '@/features/master/logs/queries/audit-logs';
import type {AuditActionFilter} from '@/features/master/logs/queries/audit-logs';
import {PORTAL_AUDIT_ACTIONS, type PortalAuditAction} from '@/features/master/audit';
import {createClient} from '@/supabase/server';

interface MasterLogsPageProps {
  searchParams: Promise<{
    q?: string;
    page?: string;
    action?: string;
    from?: string;
    dateFrom?: string;
    to?: string;
    dateTo?: string;
  }>;
}

const VALID_ACTIONS = new Set(Object.values(PORTAL_AUDIT_ACTIONS));

export default async function MasterLogsPage({searchParams}: MasterLogsPageProps) {
  const params = await searchParams;
  const search = params.q?.trim() ?? '';
  const page = Math.max(1, Number(params.page ?? '1') || 1);
  const action: AuditActionFilter = VALID_ACTIONS.has(
    params.action as PortalAuditAction,
  )
    ? (params.action as AuditActionFilter)
    : 'all';
  const dateFrom = params.from ?? params.dateFrom ?? '';
  const dateTo = params.to ?? params.dateTo ?? '';

  let data = null;
  let error: string | null = null;

  try {
    const supabase = await createClient();
    data = await listAuditLogs(supabase, {
      search,
      page,
      action,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
  } catch (fetchError) {
    error =
      fetchError instanceof Error ? fetchError.message : 'Erro ao carregar logs.';
  }

  return (
    <PageTemplate title="Logs" description="Logs de auditoria da plataforma">
      <Section>
        <AuditLogsList
          key={`${search}-${page}-${action}-${dateFrom}-${dateTo}`}
          initialData={data}
          initialSearch={search}
          initialPage={page}
          initialAction={action}
          initialDateFrom={dateFrom}
          initialDateTo={dateTo}
          error={error}
        />
      </Section>
    </PageTemplate>
  );
}
