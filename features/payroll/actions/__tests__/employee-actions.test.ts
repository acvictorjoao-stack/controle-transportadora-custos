import {beforeEach, describe, expect, it, vi} from 'vitest';

import {COMPANY_ACCESS_DENIED} from '@/lib/auth/company';

const SESSION_COMPANY_ID = 'company-session';
const OTHER_COMPANY_ID = 'company-other';
const PROFILE_ID = 'profile-1';
const POSITION_ID = '33333333-3333-4333-8333-333333333333';
const INACTIVE_POSITION_ID = '66666666-6666-4666-8666-666666666666';
const COST_CENTER_ID = '22222222-2222-4222-8222-222222222222';
const BRANCH_ID = '44444444-4444-4444-8444-444444444444';
const EMPLOYEE_ID = '55555555-5555-4555-8555-555555555555';

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

const getPositionById = vi.fn();
const getEmployeeById = vi.fn();
const createEmployee = vi.fn();
const updateEmployee = vi.fn();
const setEmployeeStatus = vi.fn();

vi.mock('../../queries', () => ({
  getPositionById: (...args: unknown[]) => getPositionById(...args),
  getEmployeeById: (...args: unknown[]) => getEmployeeById(...args),
  createEmployee: (...args: unknown[]) => createEmployee(...args),
  updateEmployee: (...args: unknown[]) => updateEmployee(...args),
  setEmployeeStatus: (...args: unknown[]) => setEmployeeStatus(...args),
}));

const getCostCenterById = vi.fn();
vi.mock('@/features/cost-centers/queries', () => ({
  getCostCenterById: (...args: unknown[]) => getCostCenterById(...args),
}));

const getBranchById = vi.fn();
vi.mock('@/features/organization/branches/queries', () => ({
  getBranchById: (...args: unknown[]) => getBranchById(...args),
}));

const {
  createEmployeeAction,
  updateEmployeeAction,
  toggleEmployeeStatusAction,
} = await import('../employee-actions');

function validEmployeeInput(overrides: Record<string, unknown> = {}) {
  return {
    name: 'JOÃO SILVA',
    positionId: POSITION_ID,
    costCenterId: COST_CENTER_ID,
    branchId: BRANCH_ID,
    cpf: '12345678901',
    registrationNumber: 'MAT-001',
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
  getPositionById.mockResolvedValue({
    id: POSITION_ID,
    companyId: SESSION_COMPANY_ID,
    active: true,
    status: 'active',
  });
  getEmployeeById.mockResolvedValue({
    id: EMPLOYEE_ID,
    companyId: SESSION_COMPANY_ID,
    positionId: INACTIVE_POSITION_ID,
  });
  getCostCenterById.mockResolvedValue({id: COST_CENTER_ID, companyId: SESSION_COMPANY_ID});
  getBranchById.mockResolvedValue({id: BRANCH_ID, companyId: SESSION_COMPANY_ID});
  createEmployee.mockResolvedValue({id: EMPLOYEE_ID, name: 'JOÃO SILVA'});
  updateEmployee.mockResolvedValue({id: EMPLOYEE_ID, name: 'JOÃO SILVA'});
  setEmployeeStatus.mockResolvedValue({id: EMPLOYEE_ID, status: 'inactive'});
}

beforeEach(() => {
  vi.clearAllMocks();
  grantAccess();
});

describe('employee actions', () => {
  it('cria funcionário com financeiro:create', async () => {
    const result = await createEmployeeAction(validEmployeeInput());

    expect(assertCompanyPermission).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'financeiro:create',
    );
    expect(result.success).toBe(true);
    expect(createEmployee).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      expect.objectContaining({positionId: POSITION_ID, costCenterId: COST_CENTER_ID}),
      PROFILE_ID,
    );
  });

  it('atualiza funcionário com financeiro:update', async () => {
    await updateEmployeeAction(EMPLOYEE_ID, validEmployeeInput({name: 'MARIA SOUZA'}));

    expect(assertCompanyPermission).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'financeiro:update',
    );
    expect(updateEmployee).toHaveBeenCalled();
  });

  it('rejeita cargo de outra empresa', async () => {
    getPositionById.mockResolvedValue(null);

    const result = await createEmployeeAction(validEmployeeInput());

    expect(result.success).toBe(false);
    expect(createEmployee).not.toHaveBeenCalled();
    expect(result.fieldErrors?.positionId).toBeTruthy();
  });

  it('novo funcionário não aceita cargo inativo', async () => {
    getPositionById.mockResolvedValue({
      id: INACTIVE_POSITION_ID,
      companyId: SESSION_COMPANY_ID,
      active: false,
      status: 'inactive',
    });

    const result = await createEmployeeAction(
      validEmployeeInput({positionId: INACTIVE_POSITION_ID}),
    );

    expect(result.success).toBe(false);
    expect(createEmployee).not.toHaveBeenCalled();
    expect(result.fieldErrors?.positionId).toBe('Selecione um cargo ativo.');
  });

  it('novo funcionário aceita cargo ativo', async () => {
    const result = await createEmployeeAction(validEmployeeInput());

    expect(result.success).toBe(true);
    expect(createEmployee).toHaveBeenCalled();
  });

  it('edição preserva cargo atual inativo', async () => {
    getPositionById.mockResolvedValue({
      id: INACTIVE_POSITION_ID,
      companyId: SESSION_COMPANY_ID,
      active: false,
      status: 'inactive',
    });
    getEmployeeById.mockResolvedValue({
      id: EMPLOYEE_ID,
      companyId: SESSION_COMPANY_ID,
      positionId: INACTIVE_POSITION_ID,
    });

    const result = await updateEmployeeAction(
      EMPLOYEE_ID,
      validEmployeeInput({positionId: INACTIVE_POSITION_ID}),
    );

    expect(result.success).toBe(true);
    expect(updateEmployee).toHaveBeenCalled();
  });

  it('edição não permite trocar para outro cargo inativo', async () => {
    getPositionById.mockResolvedValue({
      id: INACTIVE_POSITION_ID,
      companyId: SESSION_COMPANY_ID,
      active: false,
      status: 'inactive',
    });
    getEmployeeById.mockResolvedValue({
      id: EMPLOYEE_ID,
      companyId: SESSION_COMPANY_ID,
      positionId: POSITION_ID,
    });

    const result = await updateEmployeeAction(
      EMPLOYEE_ID,
      validEmployeeInput({positionId: INACTIVE_POSITION_ID}),
    );

    expect(result.success).toBe(false);
    expect(updateEmployee).not.toHaveBeenCalled();
    expect(result.fieldErrors?.positionId).toBe('Selecione um cargo ativo.');
  });

  it('rejeita centro de custo de outra empresa', async () => {
    getCostCenterById.mockResolvedValue(null);

    const result = await createEmployeeAction(validEmployeeInput());

    expect(result.success).toBe(false);
    expect(createEmployee).not.toHaveBeenCalled();
    expect(result.fieldErrors?.costCenterId).toBeTruthy();
  });

  it('rejeita filial de outra empresa', async () => {
    getBranchById.mockResolvedValue(null);

    const result = await createEmployeeAction(validEmployeeInput());

    expect(result.success).toBe(false);
    expect(createEmployee).not.toHaveBeenCalled();
    expect(result.fieldErrors?.branchId).toBeTruthy();
  });

  it('nega operação sem permissão', async () => {
    assertCompanyPermission.mockResolvedValue(false);

    const result = await createEmployeeAction(validEmployeeInput());

    expect(result.success).toBe(false);
    expect(result.error).toBe(COMPANY_ACCESS_DENIED);
    expect(createEmployee).not.toHaveBeenCalled();
  });

  it('master sem contexto de empresa é bloqueado', async () => {
    getCurrentCompanyId.mockResolvedValue(null);

    const result = await createEmployeeAction(validEmployeeInput());

    expect(result.success).toBe(false);
    expect(createEmployee).not.toHaveBeenCalled();
  });

  it('master sem atuar na empresa é bloqueado', async () => {
    isPortalOwner.mockResolvedValue(true);
    getCompanyAccessContext.mockResolvedValue({
      companyId: SESSION_COMPANY_ID,
      profileId: PROFILE_ID,
      isMasterActing: false,
    });

    const result = await createEmployeeAction(validEmployeeInput());

    expect(result.success).toBe(false);
    expect(result.error).toBe(COMPANY_ACCESS_DENIED);
  });

  it('alterna status do funcionário', async () => {
    const result = await toggleEmployeeStatusAction(EMPLOYEE_ID, false);

    expect(result.success).toBe(true);
    expect(setEmployeeStatus).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      EMPLOYEE_ID,
      'inactive',
      PROFILE_ID,
    );
  });

  it('usa somente a empresa da sessão', async () => {
    await createEmployeeAction(validEmployeeInput({companyId: OTHER_COMPANY_ID}));

    expect(createEmployee).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      expect.any(Object),
      PROFILE_ID,
    );
  });
});
