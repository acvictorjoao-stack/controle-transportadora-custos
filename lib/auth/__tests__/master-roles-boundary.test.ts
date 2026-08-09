import {describe, expect, it} from 'vitest';

import {
  BUSINESS_ROLE_NAMES,
  filterAssignableBusinessRoles,
  isBusinessRoleName,
} from '@/features/organization/members/business-roles';

describe('company role assignment boundaries', () => {
  it('exposes only the six business profiles for assignment', () => {
    expect(BUSINESS_ROLE_NAMES).toEqual([
      'Super Admin',
      'Administrador',
      'Financeiro',
      'Operacional',
      'Cadastro',
      'Consulta',
    ]);
  });

  it('filters assignable roles to business catalog only', () => {
    const roles = filterAssignableBusinessRoles([
      {name: 'Financeiro'},
      {name: 'Custom Legacy'},
      {name: 'Operacional'},
    ]);

    expect(roles.map((role) => role.name)).toEqual([
      'Financeiro',
      'Operacional',
    ]);
  });

  it('does not treat arbitrary names as business roles', () => {
    expect(isBusinessRoleName('Admin')).toBe(false);
    expect(isBusinessRoleName('Manager')).toBe(false);
  });
});
