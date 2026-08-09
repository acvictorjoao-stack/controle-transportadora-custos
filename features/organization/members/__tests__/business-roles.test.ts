import {describe, expect, it} from 'vitest';

import {
  DEFAULT_MEMBER_ROLE_NAME,
  filterAssignableBusinessRoles,
  getLastSuperAdminBlockMessage,
  LAST_SUPER_ADMIN_MESSAGE,
  sortBusinessRoles,
  SUPER_ADMIN_ROLE_NAME,
} from '../business-roles';

describe('business-roles', () => {
  it('filters and sorts only the six business profiles', () => {
    const roles = [
      {id: '1', name: 'Operator'},
      {id: '2', name: 'Consulta'},
      {id: '3', name: 'Manager'},
      {id: '4', name: 'Super Admin'},
      {id: '5', name: 'Financeiro'},
      {id: '6', name: 'Admin'},
      {id: '7', name: 'Administrador'},
      {id: '8', name: 'Operacional'},
      {id: '9', name: 'Cadastro'},
    ];

    expect(filterAssignableBusinessRoles(roles).map((role) => role.name)).toEqual([
      'Super Admin',
      'Administrador',
      'Financeiro',
      'Operacional',
      'Cadastro',
      'Consulta',
    ]);
  });

  it('sorts business roles in canonical order', () => {
    const sorted = sortBusinessRoles([
      {name: 'Consulta'},
      {name: 'Super Admin'},
      {name: 'Cadastro'},
    ]);
    expect(sorted.map((role) => role.name)).toEqual([
      'Super Admin',
      'Cadastro',
      'Consulta',
    ]);
  });

  it('defaults new members to Consulta', () => {
    expect(DEFAULT_MEMBER_ROLE_NAME).toBe('Consulta');
  });

  it('blocks deactivating the last active Super Admin', () => {
    expect(
      getLastSuperAdminBlockMessage({
        targetIsActiveSuperAdmin: true,
        activeSuperAdminCount: 1,
        willDeactivate: true,
        willDemote: false,
      }),
    ).toBe(LAST_SUPER_ADMIN_MESSAGE);
  });

  it('blocks demoting the last active Super Admin', () => {
    expect(
      getLastSuperAdminBlockMessage({
        targetIsActiveSuperAdmin: true,
        activeSuperAdminCount: 1,
        willDeactivate: false,
        willDemote: true,
      }),
    ).toBe(LAST_SUPER_ADMIN_MESSAGE);
  });

  it('allows demote/deactivate when another Super Admin remains', () => {
    expect(
      getLastSuperAdminBlockMessage({
        targetIsActiveSuperAdmin: true,
        activeSuperAdminCount: 2,
        willDeactivate: true,
        willDemote: true,
      }),
    ).toBeNull();
  });

  it('ignores non Super Admin targets', () => {
    expect(
      getLastSuperAdminBlockMessage({
        targetIsActiveSuperAdmin: false,
        activeSuperAdminCount: 1,
        willDeactivate: true,
        willDemote: true,
      }),
    ).toBeNull();
  });

  it('keeps Super Admin role name stable for RLS helpers', () => {
    expect(SUPER_ADMIN_ROLE_NAME).toBe('Super Admin');
  });
});
