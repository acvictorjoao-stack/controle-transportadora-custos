import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  mapCompanyBranchSummary,
  mapCompanyMemberSummary,
} from '../../services/mappers';
import type {CompanyBranchRow, CompanyMemberSummaryRow} from '../../types';

const {getCompanyBranches, getCompanyMembers} = await import('../companies');

type QueryCall = {
  table: string;
  companyId: string | null;
  deletedAtNull: boolean;
  statusActive: boolean;
  orderedByName: boolean;
};

function createScopedListMock(options: {
  table: 'branches' | 'company_members';
  rowsByCompany: Record<string, unknown[]>;
}) {
  const calls: QueryCall[] = [];

  const client = {
    from(table: string) {
      if (table !== options.table) {
        throw new Error(`Tabela inesperada: ${table}`);
      }

      let companyId: string | null = null;
      let deletedAtNull = false;
      let statusActive = false;
      let orderedByName = false;

      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          if (column === 'company_id') companyId = String(value);
          if (column === 'status' && value === 'active') statusActive = true;
          return builder;
        },
        is: (column: string, value: unknown) => {
          if (column === 'deleted_at' && value === null) deletedAtNull = true;
          return builder;
        },
        order: (column: string) => {
          if (column === 'name') orderedByName = true;
          return builder;
        },
        then: (resolve: (value: {data: unknown[]; error: null}) => unknown) => {
          calls.push({
            table,
            companyId,
            deletedAtNull,
            statusActive,
            orderedByName,
          });
          const rows = companyId ? (options.rowsByCompany[companyId] ?? []) : [];
          return Promise.resolve(resolve({data: rows, error: null}));
        },
      };

      return builder;
    },
  };

  return {client, calls};
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mapCompanyBranchSummary / mapCompanyMemberSummary', () => {
  it('mapeia filial com campos reais do schema', () => {
    const row: CompanyBranchRow = {
      id: 'b1',
      code: 'HQ',
      name: 'Matriz SP',
      address_city: 'São Paulo',
      address_state: 'SP',
      status: 'active',
      is_headquarters: true,
    };

    expect(mapCompanyBranchSummary(row)).toEqual({
      id: 'b1',
      code: 'HQ',
      name: 'Matriz SP',
      city: 'São Paulo',
      state: 'SP',
      status: 'active',
      isHeadquarters: true,
    });
  });

  it('mapeia membro com profile e role', () => {
    const row: CompanyMemberSummaryRow = {
      id: 'm1',
      status: 'active',
      profiles: {
        full_name: 'Ana Costa',
        email: 'ana@demo.local',
        last_login_at: '2026-01-01T00:00:00.000Z',
      },
      roles: {name: 'Administrador'},
    };

    expect(mapCompanyMemberSummary(row)).toEqual({
      id: 'm1',
      fullName: 'Ana Costa',
      email: 'ana@demo.local',
      roleName: 'Administrador',
      status: 'active',
      lastLoginAt: '2026-01-01T00:00:00.000Z',
    });
  });
});

describe('getCompanyBranches', () => {
  it('retorna somente filiais da empresa solicitada', async () => {
    const mock = createScopedListMock({
      table: 'branches',
      rowsByCompany: {
        'company-a': [
          {
            id: 'ba1',
            code: 'A1',
            name: 'Filial A1',
            address_city: 'Recife',
            address_state: 'PE',
            status: 'active',
            is_headquarters: true,
          },
        ],
        'company-b': [
          {
            id: 'bb1',
            code: 'B1',
            name: 'Filial B1',
            address_city: 'Salvador',
            address_state: 'BA',
            status: 'active',
            is_headquarters: false,
          },
        ],
      },
    });

    const result = await getCompanyBranches(mock.client as never, 'company-a');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('ba1');
    expect(result[0]?.name).toBe('Filial A1');
    expect(mock.calls[0]).toMatchObject({
      companyId: 'company-a',
      deletedAtNull: true,
    });
  });

  it('não retorna filiais de outra empresa', async () => {
    const mock = createScopedListMock({
      table: 'branches',
      rowsByCompany: {
        'company-a': [
          {
            id: 'ba1',
            code: 'A1',
            name: 'Filial A',
            address_city: null,
            address_state: null,
            status: 'active',
            is_headquarters: false,
          },
        ],
        'company-b': [
          {
            id: 'bb1',
            code: 'B1',
            name: 'Filial B',
            address_city: null,
            address_state: null,
            status: 'active',
            is_headquarters: false,
          },
        ],
      },
    });

    const resultA = await getCompanyBranches(mock.client as never, 'company-a');
    const resultB = await getCompanyBranches(mock.client as never, 'company-b');

    expect(resultA.map((item) => item.id)).toEqual(['ba1']);
    expect(resultB.map((item) => item.id)).toEqual(['bb1']);
  });

  it('retorna lista vazia quando a empresa não tem filiais', async () => {
    const mock = createScopedListMock({
      table: 'branches',
      rowsByCompany: {'company-empty': []},
    });

    await expect(
      getCompanyBranches(mock.client as never, 'company-empty'),
    ).resolves.toEqual([]);
  });
});

describe('getCompanyMembers', () => {
  it('retorna somente membros ativos da empresa', async () => {
    const mock = createScopedListMock({
      table: 'company_members',
      rowsByCompany: {
        'company-a': [
          {
            id: 'ma1',
            status: 'active',
            profiles: {
              full_name: 'Ana Costa',
              email: 'ana@a.local',
              last_login_at: null,
            },
            roles: {name: 'Administrador'},
          },
        ],
      },
    });

    const result = await getCompanyMembers(mock.client as never, 'company-a');

    expect(result).toEqual([
      {
        id: 'ma1',
        fullName: 'Ana Costa',
        email: 'ana@a.local',
        roleName: 'Administrador',
        status: 'active',
        lastLoginAt: null,
      },
    ]);
    expect(mock.calls[0]).toMatchObject({
      companyId: 'company-a',
      deletedAtNull: true,
      statusActive: true,
    });
  });

  it('não retorna usuários de outra empresa', async () => {
    const mock = createScopedListMock({
      table: 'company_members',
      rowsByCompany: {
        'company-a': [
          {
            id: 'ma1',
            status: 'active',
            profiles: {
              full_name: 'User A',
              email: 'a@demo.local',
              last_login_at: null,
            },
            roles: {name: 'Consulta'},
          },
        ],
        'company-b': [
          {
            id: 'mb1',
            status: 'active',
            profiles: {
              full_name: 'User B',
              email: 'b@demo.local',
              last_login_at: null,
            },
            roles: {name: 'Operacional'},
          },
        ],
      },
    });

    const resultA = await getCompanyMembers(mock.client as never, 'company-a');
    const resultB = await getCompanyMembers(mock.client as never, 'company-b');

    expect(resultA.map((item) => item.id)).toEqual(['ma1']);
    expect(resultB.map((item) => item.id)).toEqual(['mb1']);
    expect(resultA[0]?.email).toBe('a@demo.local');
    expect(resultB[0]?.email).toBe('b@demo.local');
  });

  it('retorna lista vazia quando não há usuários', async () => {
    const mock = createScopedListMock({
      table: 'company_members',
      rowsByCompany: {'company-empty': []},
    });

    await expect(
      getCompanyMembers(mock.client as never, 'company-empty'),
    ).resolves.toEqual([]);
  });
});
