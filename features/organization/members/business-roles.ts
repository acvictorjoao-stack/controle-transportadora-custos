/** Business role profiles available for company membership assignment. */
export const BUSINESS_ROLE_NAMES = [
  'Super Admin',
  'Administrador',
  'Financeiro',
  'Operacional',
  'Cadastro',
  'Consulta',
] as const;

export type BusinessRoleName = (typeof BUSINESS_ROLE_NAMES)[number];

export const SUPER_ADMIN_ROLE_NAME: BusinessRoleName = 'Super Admin';

/** Default profile when creating a new company user. */
export const DEFAULT_MEMBER_ROLE_NAME: BusinessRoleName = 'Consulta';

export const LAST_SUPER_ADMIN_MESSAGE =
  'Não é possível remover ou rebaixar o último Super Admin ativo da empresa.';

const BUSINESS_ROLE_ORDER = new Map<string, number>(
  BUSINESS_ROLE_NAMES.map((name, index) => [name, index]),
);

export function isBusinessRoleName(name: string): name is BusinessRoleName {
  return BUSINESS_ROLE_ORDER.has(name);
}

export function isSuperAdminRoleName(name: string): boolean {
  return name === SUPER_ADMIN_ROLE_NAME;
}

/** Sort assignable roles in the canonical business order. */
export function sortBusinessRoles<T extends {name: string}>(roles: T[]): T[] {
  return [...roles].sort((a, b) => {
    const aOrder = BUSINESS_ROLE_ORDER.get(a.name) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = BUSINESS_ROLE_ORDER.get(b.name) ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name, 'pt-BR');
  });
}

/**
 * Roles shown in the membership form.
 * Only the six business profiles — never legacy Manager/Operator/Admin labels.
 */
export function filterAssignableBusinessRoles<T extends {name: string}>(
  roles: T[],
): T[] {
  return sortBusinessRoles(roles.filter((role) => isBusinessRoleName(role.name)));
}

/**
 * Pure guard used before deactivate / demote of a Super Admin membership.
 * Returns an error message when the action would leave the company without
 * an active Super Admin; otherwise null.
 */
export function getLastSuperAdminBlockMessage(input: {
  targetIsActiveSuperAdmin: boolean;
  activeSuperAdminCount: number;
  willDeactivate: boolean;
  willDemote: boolean;
}): string | null {
  if (!input.targetIsActiveSuperAdmin) return null;
  if (input.activeSuperAdminCount !== 1) return null;
  if (!input.willDeactivate && !input.willDemote) return null;
  return LAST_SUPER_ADMIN_MESSAGE;
}
