export const PORTAL_AUDIT_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  COMPANY_CREATE: 'company_create',
  COMPANY_UPDATE: 'company_update',
  COMPANY_PROVISION: 'company_provision',
  COMPANY_DELETE: 'company_delete',
  PASSWORD_RESET: 'password_reset',
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_ROLE_CHANGE: 'user_role_change',
  USER_ACTIVATE: 'user_activate',
  USER_DEACTIVATE: 'user_deactivate',
  PLAN_CHANGE: 'plan_change',
  COMPANY_SUSPEND: 'company_suspend',
  COMPANY_REACTIVATE: 'company_reactivate',
  SETTINGS_UPDATE: 'settings_update',
} as const;

export type PortalAuditAction =
  (typeof PORTAL_AUDIT_ACTIONS)[keyof typeof PORTAL_AUDIT_ACTIONS];

export const PORTAL_AUDIT_ACTION_LABELS: Record<PortalAuditAction, string> = {
  login: 'Login',
  logout: 'Logout',
  company_create: 'Criação de empresa',
  company_update: 'Atualização de empresa',
  company_provision: 'Provisionamento',
  company_delete: 'Exclusão de empresa',
  password_reset: 'Reset de senha',
  user_create: 'Criação de usuário',
  user_update: 'Atualização de usuário',
  user_role_change: 'Alteração de papel',
  user_activate: 'Ativação de usuário',
  user_deactivate: 'Inativação de usuário',
  plan_change: 'Alteração de plano',
  company_suspend: 'Suspensão de empresa',
  company_reactivate: 'Reativação de empresa',
  settings_update: 'Atualização de configurações',
};

export interface PortalAuditLogRow {
  id: string;
  action: PortalAuditAction;
  actor_profile_id: string | null;
  actor_email: string | null;
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface PortalAuditLogItem {
  id: string;
  action: PortalAuditAction;
  actionLabel: string;
  actorEmail: string | null;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface LogPortalAuditInput {
  action: PortalAuditAction;
  actorProfileId?: string | null;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}
