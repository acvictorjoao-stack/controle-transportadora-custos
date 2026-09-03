import {beforeEach, describe, expect, it, vi} from 'vitest';

const isPortalOwner = vi.fn();
const getUser = vi.fn();
const maybeSingle = vi.fn();
const upsert = vi.fn();

const supabase = {
  auth: {getUser},
  from: vi.fn((table: string) => {
    if (table === 'companies') {
      return {
        select: () => ({
          eq: () => ({
            is: () => ({
              maybeSingle,
            }),
          }),
        }),
      };
    }

    if (table === 'portal_acting_companies') {
      return {upsert};
    }

    throw new Error(`Tabela inesperada: ${table}`);
  }),
};

vi.mock('@/lib/auth/portal', () => ({
  isPortalOwner: (...args: unknown[]) => isPortalOwner(...args),
}));

vi.mock('@/supabase/server', () => ({
  createClient: async () => supabase,
}));

vi.mock('@/supabase/middleware/timing', () => ({
  measureMiddlewareSupabase: async (
    _client: unknown,
    _table: string,
    _label: string,
    run: () => Promise<unknown>,
  ) => run(),
}));

const {setMasterActingCompany} = await import(
  '@/lib/auth/master-company-context'
);

beforeEach(() => {
  vi.clearAllMocks();
  isPortalOwner.mockResolvedValue(true);
  getUser.mockResolvedValue({
    data: {user: {id: 'owner-1', email: 'owner@fleetcontrol.local'}},
  });
  upsert.mockResolvedValue({error: null});
});

describe('setMasterActingCompany', () => {
  it('aceita empresa ativa e grava portal_acting_companies', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 'company-a',
        trade_name: 'Alfa',
        legal_name: 'Alfa LTDA',
        status: 'active',
      },
      error: null,
    });

    const result = await setMasterActingCompany('company-a', supabase as never);

    expect(result).toEqual({
      ok: true,
      company: {companyId: 'company-a', companyName: 'Alfa'},
    });
    expect(upsert).toHaveBeenCalledWith(
      {profile_id: 'owner-1', company_id: 'company-a'},
      {onConflict: 'profile_id'},
    );
  });

  it('rejeita empresa inativa', async () => {
    maybeSingle.mockResolvedValue({
      data: {
        id: 'company-a',
        trade_name: 'Alfa',
        legal_name: 'Alfa LTDA',
        status: 'inactive',
      },
      error: null,
    });

    const result = await setMasterActingCompany('company-a', supabase as never);

    expect(result).toEqual({
      ok: false,
      error: 'Empresa inativa. Selecione outra empresa.',
    });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejeita empresa deletada (deleted_at filtrado)', async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await setMasterActingCompany('company-deleted', supabase as never);

    expect(result).toEqual({
      ok: false,
      error: 'Empresa não encontrada ou acesso negado.',
    });
    expect(upsert).not.toHaveBeenCalled();
  });
});
