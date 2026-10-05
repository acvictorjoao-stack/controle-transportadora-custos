import {beforeEach, describe, expect, it, vi} from 'vitest';

import {
  createInMemorySupabase,
  type InMemoryDatabase,
} from '@/features/organization/__tests__/in-memory-supabase';

const deleteUser = vi.fn();
const createUser = vi.fn();
let db: InMemoryDatabase;

vi.mock('@/supabase/server/admin', () => ({
  createAdminClient: () => ({
    ...createInMemorySupabase(db, null),
    auth: {admin: {deleteUser, createUser}},
  }),
}));

const {
  cleanupOrphanedTenantAuthUsers,
  createAdminAuthUser,
  reclaimOrphanedAdminEmail,
} = await import('../auth.repository');

const COMPANY_B = 'company-b';
const VICTIM_EMAIL = 'motorista@empresa-b.com';

function seed(memberships: Array<{status: string; deleted_at: string | null}>) {
  db = {
    tables: {
      profiles: [{id: 'victim', email: VICTIM_EMAIL}],
      portal_users: [],
      company_members: memberships.map((membership) => ({
        company_id: COMPANY_B,
        profile_id: 'victim',
        ...membership,
      })),
    },
    rolePermissions: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  deleteUser.mockResolvedValue({error: null});
  createUser.mockResolvedValue({
    data: {user: null},
    error: {message: 'A user with this email address has already been registered'},
  });
});

describe('service role não apaga usuário de outra empresa', () => {
  it('membro inativo na Empresa B não é tratado como órfão', async () => {
    seed([{status: 'inactive', deleted_at: null}]);

    await expect(reclaimOrphanedAdminEmail(VICTIM_EMAIL)).resolves.toBe(false);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('criar membro na Empresa A com o e-mail dele falha sem excluir a conta', async () => {
    seed([{status: 'inactive', deleted_at: null}]);

    await expect(
      createAdminAuthUser({email: VICTIM_EMAIL, password: 'Temp#12345', fullName: 'Invasor'}),
    ).rejects.toThrow('Já existe um usuário com este e-mail de administrador.');
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('limpeza pós-exclusão de empresa preserva quem segue vinculado a outra', async () => {
    seed([{status: 'inactive', deleted_at: null}]);

    await cleanupOrphanedTenantAuthUsers(['victim']);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('perfil só com vínculos excluídos continua sendo recuperado', async () => {
    seed([{status: 'active', deleted_at: '2026-01-01T00:00:00.000Z'}]);

    await expect(reclaimOrphanedAdminEmail(VICTIM_EMAIL)).resolves.toBe(true);
    expect(deleteUser).toHaveBeenCalledWith('victim');
  });
});
