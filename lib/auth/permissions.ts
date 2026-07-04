/**
 * Papéis do Portal Master (platform-level).
 */
export const PORTAL_ROLES = {
  OWNER: 'OWNER',
  SUPPORT: 'SUPPORT',
  FINANCE: 'FINANCE',
} as const;

export type PortalRole = (typeof PORTAL_ROLES)[keyof typeof PORTAL_ROLES];

export const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  [PORTAL_ROLES.OWNER]: 'Proprietário',
  [PORTAL_ROLES.SUPPORT]: 'Suporte',
  [PORTAL_ROLES.FINANCE]: 'Financeiro',
};

export function isOwnerRole(role: PortalRole | null | undefined): boolean {
  return role === PORTAL_ROLES.OWNER;
}

/**
 * Recupera o papel do Portal Master a partir de um registro portal_users.
 */
export function getPortalRoleFromUser(
  portalUser: {role: PortalRole; active: boolean} | null | undefined,
): PortalRole | null {
  if (!portalUser?.active) {
    return null;
  }

  return portalUser.role;
}

/**
 * Verifica permissão — placeholder até RBAC granular ser implementado.
 * Apenas OWNER tem acesso ao Portal Master nesta sprint.
 */
export function hasPortalPermission(
  role: PortalRole | null | undefined,
  _permission: string,
): boolean {
  return isOwnerRole(role);
}
