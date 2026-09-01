import {beforeEach, describe, expect, it, vi} from 'vitest';

import {COMPANY_ACCESS_DENIED} from '@/lib/auth/company';

const SESSION_COMPANY_ID = 'company-session';
const PROFILE_ID = 'profile-1';
const POSITION_ID = '33333333-3333-4333-8333-333333333333';

const supabaseStub = {};

const getCurrentCompanyId = vi.fn();
const getCompanyAccessContext = vi.fn();
const assertCompanyPermission = vi.fn();
const isPortalOwner = vi.fn();

vi.mock('@/lib/auth/company', () => ({
  COMPANY_ACCESS_DENIED: 'Você não tem permissão para realizar esta ação nesta empresa.',
  getServerSupabaseClient: async () => supabaseStub,
  getCurrentCompanyId: (...args: unknown[]) => getCurrentCompanyId(...args),
  getCompanyAccessContext: (...args: unknown[]) => getCompanyAccessContext(...args),
  assertCompanyPermission: (...args: unknown[]) => assertCompanyPermission(...args),
}));

vi.mock('@/lib/auth/portal', () => ({
  isPortalOwner: (...args: unknown[]) => isPortalOwner(...args),
}));

vi.mock('next/cache', () => ({revalidatePath: vi.fn()}));

const createPosition = vi.fn();
const updatePosition = vi.fn();
const setPositionStatus = vi.fn();
const softDeletePosition = vi.fn();

vi.mock('../../queries', () => ({
  createPosition: (...args: unknown[]) => createPosition(...args),
  updatePosition: (...args: unknown[]) => updatePosition(...args),
  setPositionStatus: (...args: unknown[]) => setPositionStatus(...args),
  softDeletePosition: (...args: unknown[]) => softDeletePosition(...args),
}));

const {
  createPositionAction,
  updatePositionAction,
  togglePositionStatusAction,
  deletePositionAction,
} = await import('../position-actions');

function validPositionInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'ANALISTA FINANCEIRO',
    code: 'ANAL_FIN',
    description: 'Análises financeiras',
    status: 'active',
    ...overrides,
  };
}

function grantAccess() {
  getCurrentCompanyId.mockResolvedValue(SESSION_COMPANY_ID);
  getCompanyAccessContext.mockResolvedValue({
    companyId: SESSION_COMPANY_ID,
    profileId: PROFILE_ID,
    roleId: 'role-1',
    defaultBranchId: null,
    isMasterActing: false,
  });
  isPortalOwner.mockResolvedValue(false);
  assertCompanyPermission.mockResolvedValue(true);
  createPosition.mockResolvedValue({id: POSITION_ID, name: 'ANALISTA FINANCEIRO'});
  updatePosition.mockResolvedValue({id: POSITION_ID, name: 'ANALISTA FINANCEIRO'});
  setPositionStatus.mockResolvedValue({id: POSITION_ID, status: 'inactive'});
  softDeletePosition.mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  grantAccess();
});

describe('position actions', () => {
  it('cria cargo com financeiro:create', async () => {
    const result = await createPositionAction(validPositionInput());

    expect(assertCompanyPermission).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'financeiro:create',
    );
    expect(result.success).toBe(true);
    expect(createPosition).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      expect.objectContaining({code: 'ANAL_FIN', name: 'ANALISTA FINANCEIRO'}),
      PROFILE_ID,
    );
  });

  it('gera código quando não informado', async () => {
    await createPositionAction(validPositionInput({code: null}));

    expect(createPosition).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      expect.objectContaining({code: 'ANALISTA_FINANCEIRO'}),
      PROFILE_ID,
    );
  });

  it('atualiza cargo com financeiro:update', async () => {
    await updatePositionAction(POSITION_ID, validPositionInput({name: 'COORDENADOR FINANCEIRO'}));

    expect(assertCompanyPermission).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'financeiro:update',
    );
    expect(updatePosition).toHaveBeenCalled();
  });

  it('inativa cargo com financeiro:update', async () => {
    await togglePositionStatusAction(POSITION_ID, false);

    expect(setPositionStatus).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      POSITION_ID,
      'inactive',
      PROFILE_ID,
    );
  });

  it('impede exclusão de cargo sistema na camada de query', async () => {
    softDeletePosition.mockRejectedValue(new Error('Cargos do sistema não podem ser excluídos.'));

    const result = await deletePositionAction(POSITION_ID);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Cargos do sistema');
  });

  it('nega operação sem permissão', async () => {
    assertCompanyPermission.mockResolvedValue(false);

    const result = await createPositionAction(validPositionInput());

    expect(result.success).toBe(false);
    expect(result.error).toBe(COMPANY_ACCESS_DENIED);
    expect(createPosition).not.toHaveBeenCalled();
  });

  it('master sem contexto de empresa é bloqueado', async () => {
    getCurrentCompanyId.mockResolvedValue(null);

    const result = await createPositionAction(validPositionInput());

    expect(result.success).toBe(false);
    expect(createPosition).not.toHaveBeenCalled();
  });
});
