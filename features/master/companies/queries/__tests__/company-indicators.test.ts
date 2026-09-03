import {beforeEach, describe, expect, it, vi} from 'vitest';

const createAdminClient = vi.fn();

vi.mock('@/supabase/server/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClient(...args),
}));

vi.mock('@/features/master/provisioning/repositories/auth.repository', () => ({
  cleanupOrphanedTenantAuthUsers: vi.fn(),
}));

const {countCompanyIndicators} = await import('../companies');

type CountCall = {
  table: string;
  companyId: string | null;
  deletedAtNull: boolean;
  statusActive: boolean;
};

function createAdminMock(countsByTable: Record<string, number>) {
  const calls: CountCall[] = [];

  return {
    calls,
    client: {
      from(table: string) {
        let companyId: string | null = null;
        let deletedAtNull = false;
        let statusActive = false;

        const builder = {
          select() {
            return builder;
          },
          eq(column: string, value: unknown) {
            if (column === 'company_id') {
              companyId = String(value);
            }
            if (column === 'status' && value === 'active') {
              statusActive = true;
            }
            return builder;
          },
          is(column: string, value: unknown) {
            if (column === 'deleted_at' && value === null) {
              deletedAtNull = true;
            }
            return builder;
          },
          then(resolve: (value: {count: number; error: null}) => unknown) {
            calls.push({table, companyId, deletedAtNull, statusActive});
            return Promise.resolve(
              resolve({count: countsByTable[table] ?? 0, error: null}),
            );
          },
        };

        return builder;
      },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('countCompanyIndicators', () => {
  it('retorna contagens reais por tabela com head count', async () => {
    const mock = createAdminMock({
      branches: 2,
      company_members: 5,
      vehicles: 10,
      drivers: 7,
      customers: 4,
    });
    createAdminClient.mockReturnValue(mock.client);

    const result = await countCompanyIndicators('company-a');

    expect(result).toEqual({
      branchCount: 2,
      memberCount: 5,
      vehicleCount: 10,
      driverCount: 7,
      customerCount: 4,
    });
    expect(mock.calls).toHaveLength(5);
    expect(mock.calls.every((call) => call.companyId === 'company-a')).toBe(true);
    expect(mock.calls.every((call) => call.deletedAtNull)).toBe(true);
    expect(
      mock.calls.find((call) => call.table === 'company_members')?.statusActive,
    ).toBe(true);
  });

  it('não mistura dados entre empresas', async () => {
    const mockA = createAdminMock({
      branches: 1,
      company_members: 1,
      vehicles: 1,
      drivers: 1,
      customers: 1,
    });
    createAdminClient.mockReturnValue(mockA.client);
    await countCompanyIndicators('company-a');

    const mockB = createAdminMock({
      branches: 9,
      company_members: 8,
      vehicles: 7,
      drivers: 6,
      customers: 5,
    });
    createAdminClient.mockReturnValue(mockB.client);
    const resultB = await countCompanyIndicators('company-b');

    expect(resultB).toEqual({
      branchCount: 9,
      memberCount: 8,
      vehicleCount: 7,
      driverCount: 6,
      customerCount: 5,
    });
    expect(mockA.calls.every((call) => call.companyId === 'company-a')).toBe(true);
    expect(mockB.calls.every((call) => call.companyId === 'company-b')).toBe(true);
  });
});
