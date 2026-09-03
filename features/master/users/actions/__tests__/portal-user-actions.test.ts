import {beforeEach, describe, expect, it, vi} from 'vitest';

import {PORTAL_ACCESS_DENIED} from '@/lib/auth/guards';
import {PORTAL_ROLES} from '@/lib/auth/permissions';

const guardPortalOwner = vi.fn();
const getPortalUserById = vi.fn();
const countActivePortalOwners = vi.fn();
const logPortalAudit = vi.fn();
const removePortalUserAccess = vi.fn();
const revalidatePath = vi.fn();
const getUser = vi.fn();
const createAdminClient = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  PORTAL_ACCESS_DENIED: 'Acesso negado.',
  guardPortalOwner: (...args: unknown[]) => guardPortalOwner(...args),
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock('@/supabase/server', () => ({
  createClient: async () => ({
    auth: {getUser},
  }),
}));

vi.mock('@/supabase/server/admin', () => ({
  createAdminClient: (...args: unknown[]) => createAdminClient(...args),
}));

vi.mock('../../queries', () => ({
  getPortalUserById: (...args: unknown[]) => getPortalUserById(...args),
  countActivePortalOwners: (...args: unknown[]) => countActivePortalOwners(...args),
}));

vi.mock('@/features/master/audit', () => ({
  logPortalAudit: (...args: unknown[]) => logPortalAudit(...args),
  PORTAL_AUDIT_ACTIONS: {
    USER_DELETE: 'user_delete',
  },
}));

vi.mock('../../services/delete-portal-user', async () => {
  const actual = await vi.importActual<
    typeof import('../../services/delete-portal-user')
  >('../../services/delete-portal-user');
  return {
    ...actual,
    removePortalUserAccess: (...args: unknown[]) => removePortalUserAccess(...args),
  };
});

const {deletePortalUserAction} = await import('../portal-user-actions');

const TARGET = {
  id: 'portal-user-1',
  profileId: 'profile-target',
  fullName: 'Ana Costa',
  email: 'ana@fleetcontrol.local',
  role: PORTAL_ROLES.SUPPORT,
  status: 'active' as const,
  lastLoginAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const adminStub = {from: vi.fn()};

function grantOwner(actorProfileId = 'profile-actor') {
  guardPortalOwner.mockResolvedValue(true);
  getUser.mockResolvedValue({
    data: {user: {id: actorProfileId, email: 'owner@fleetcontrol.local'}},
  });
  createAdminClient.mockReturnValue(adminStub);
  getPortalUserById.mockResolvedValue(TARGET);
  countActivePortalOwners.mockResolvedValue(2);
  logPortalAudit.mockResolvedValue(undefined);
  removePortalUserAccess.mockResolvedValue({removedAuthUser: true});
}

beforeEach(() => {
  vi.clearAllMocks();
  grantOwner();
});

describe('deletePortalUserAction', () => {
  it('bloqueia tentativa sem permissão de OWNER', async () => {
    guardPortalOwner.mockResolvedValue(false);

    const result = await deletePortalUserAction(TARGET.id);

    expect(result).toEqual({success: false, error: PORTAL_ACCESS_DENIED});
    expect(getPortalUserById).not.toHaveBeenCalled();
    expect(removePortalUserAccess).not.toHaveBeenCalled();
  });

  it('retorna erro quando o usuário não existe', async () => {
    getPortalUserById.mockResolvedValue(null);

    const result = await deletePortalUserAction('missing-id');

    expect(result).toEqual({success: false, error: 'Usuário não encontrado.'});
    expect(removePortalUserAccess).not.toHaveBeenCalled();
  });

  it('impede que o OWNER exclua a si próprio', async () => {
    grantOwner(TARGET.profileId);

    const result = await deletePortalUserAction(TARGET.id);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected failure');
    expect(result.error).toBe('Você não pode excluir o próprio usuário.');
    expect(removePortalUserAccess).not.toHaveBeenCalled();
  });

  it('protege o último proprietário ativo', async () => {
    getPortalUserById.mockResolvedValue({
      ...TARGET,
      role: PORTAL_ROLES.OWNER,
    });
    countActivePortalOwners.mockResolvedValue(1);

    const result = await deletePortalUserAction(TARGET.id);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('expected failure');
    expect(result.error).toBe(
      'Não é possível excluir o último proprietário da plataforma.',
    );
    expect(removePortalUserAccess).not.toHaveBeenCalled();
  });

  it('exclui usuário autorizado, audita e revalida a lista', async () => {
    const result = await deletePortalUserAction(TARGET.id);

    expect(result).toEqual({success: true, data: undefined});
    expect(logPortalAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'user_delete',
        targetId: TARGET.id,
        targetLabel: TARGET.email,
      }),
    );
    expect(removePortalUserAccess).toHaveBeenCalledWith(adminStub, TARGET);
    expect(revalidatePath).toHaveBeenCalledWith('/master/usuarios');
  });

  it('trata erro inesperado da exclusão', async () => {
    removePortalUserAccess.mockRejectedValue(new Error('falha no admin'));

    const result = await deletePortalUserAction(TARGET.id);

    expect(result).toEqual({success: false, error: 'falha no admin'});
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
