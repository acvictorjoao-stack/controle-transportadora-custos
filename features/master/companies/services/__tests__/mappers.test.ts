import {describe, expect, it} from 'vitest';

import {
  mapAdminMembersByCompany,
  pickPrincipalAdminMember,
} from '../mappers';
import type {AdminMemberRow} from '../../types';

function makeRow(
  companyId: string,
  roleName: string,
  email: string,
): AdminMemberRow {
  return {
    company_id: companyId,
    profile_id: `${companyId}-${roleName}`,
    profiles: {
      full_name: `${roleName} User`,
      email,
      last_login_at: null,
    },
    roles: {name: roleName},
  };
}

describe('pickPrincipalAdminMember', () => {
  it('prioriza Super Admin sobre Administrador', () => {
    const rows = [
      makeRow('c1', 'Administrador', 'admin@demo.local'),
      makeRow('c1', 'Super Admin', 'super@demo.local'),
    ];

    const picked = pickPrincipalAdminMember(rows);
    expect(picked?.profiles?.email).toBe('super@demo.local');
  });

  it('retorna Administrador quando não há Super Admin', () => {
    const rows = [makeRow('c1', 'Administrador', 'admin@demo.local')];
    const picked = pickPrincipalAdminMember(rows);
    expect(picked?.profiles?.email).toBe('admin@demo.local');
  });

  it('ignora perfis que não são administrador principal', () => {
    const rows = [makeRow('c1', 'Consulta', 'consulta@demo.local')];
    expect(pickPrincipalAdminMember(rows)).toBeNull();
  });
});

describe('mapAdminMembersByCompany', () => {
  it('mapeia administrador principal por empresa', () => {
    const map = mapAdminMembersByCompany([
      makeRow('c1', 'Administrador', 'admin@demo.local'),
      makeRow('c2', 'Super Admin', 'super@other.local'),
    ]);

    expect(map.get('c1')).toEqual({
      fullName: 'Administrador User',
      email: 'admin@demo.local',
    });
    expect(map.get('c2')).toEqual({
      fullName: 'Super Admin User',
      email: 'super@other.local',
    });
  });
});
