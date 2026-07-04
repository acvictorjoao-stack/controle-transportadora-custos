import type {SupabaseClient} from '@supabase/supabase-js';

import {
  PORTAL_AUDIT_ACTION_LABELS,
  type PortalAuditAction,
  type PortalAuditLogItem,
  type PortalAuditLogRow,
} from '@/features/master/audit';

import {AUDIT_LOGS_PAGE_SIZE} from '../constants';

export interface PaginatedAuditLogs {
  items: PortalAuditLogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type AuditActionFilter = PortalAuditAction | 'all';

export interface ListAuditLogsOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  action?: AuditActionFilter;
  dateFrom?: string;
  dateTo?: string;
}

function mapAuditLogRow(row: PortalAuditLogRow): PortalAuditLogItem {
  return {
    id: row.id,
    action: row.action,
    actionLabel: PORTAL_AUDIT_ACTION_LABELS[row.action] ?? row.action,
    actorEmail: row.actor_email,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

export async function listAuditLogs(
  supabase: SupabaseClient,
  options: ListAuditLogsOptions = {},
): Promise<PaginatedAuditLogs> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = options.pageSize ?? AUDIT_LOGS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const search = options.search?.trim() ?? '';

  let query = supabase
    .from('portal_audit_logs')
    .select('*', {count: 'exact'});

  if (options.action && options.action !== 'all') {
    query = query.eq('action', options.action);
  }

  if (options.dateFrom) {
    query = query.gte('created_at', options.dateFrom);
  }

  if (options.dateTo) {
    query = query.lte('created_at', `${options.dateTo}T23:59:59.999Z`);
  }

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(
      `actor_email.ilike.${pattern},target_label.ilike.${pattern},target_id.ilike.${pattern}`,
    );
  }

  const {data, error, count} = await query
    .order('created_at', {ascending: false})
    .range(from, to);

  if (error) {
    throw new Error(error.message);
  }

  const total = count ?? 0;

  return {
    items: (data ?? []).map((row) =>
      mapAuditLogRow(row as unknown as PortalAuditLogRow),
    ),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function exportAuditLogs(
  supabase: SupabaseClient,
  options: Omit<ListAuditLogsOptions, 'page' | 'pageSize'> = {},
): Promise<PortalAuditLogItem[]> {
  const pageSize = 500;
  const allItems: PortalAuditLogItem[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const result = await listAuditLogs(supabase, {
      ...options,
      page,
      pageSize,
    });
    allItems.push(...result.items);
    totalPages = result.totalPages;
    page += 1;
  } while (page <= totalPages);

  return allItems;
}

export function auditLogsToCsv(items: PortalAuditLogItem[]): string {
  const headers = [
    'Data',
    'Ação',
    'Ator',
    'Tipo alvo',
    'ID alvo',
    'Descrição alvo',
    'Metadados',
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = items.map((item) =>
    [
      item.createdAt,
      item.actionLabel,
      item.actorEmail ?? '',
      item.targetType ?? '',
      item.targetId ?? '',
      item.targetLabel ?? '',
      JSON.stringify(item.metadata),
    ]
      .map(escape)
      .join(','),
  );

  return [headers.map(escape).join(','), ...rows].join('\n');
}
