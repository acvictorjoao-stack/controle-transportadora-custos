import {beforeEach, describe, expect, it, vi} from 'vitest';

import {COMPANY_ACCESS_DENIED} from '@/lib/auth/company';

const SESSION_COMPANY_ID = 'company-session';
const OTHER_COMPANY_ID = 'company-alheia';
const PROFILE_ID = 'profile-1';
const PERSON_ID = '11111111-1111-4111-8111-111111111111';
const COST_CENTER_ID = '22222222-2222-4222-8222-222222222222';

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

const getCostCenterById = vi.fn();
vi.mock('@/features/cost-centers/queries', () => ({
  getCostCenterById: (...args: unknown[]) => getCostCenterById(...args),
}));

const getPayrollPersonById = vi.fn();
const getPositionById = vi.fn();
const listPayrollDuplicateCandidates = vi.fn();
const createPayrollExpense = vi.fn();
const updatePayrollExpense = vi.fn();
const getPayrollExpenseById = vi.fn();
const softDeletePayrollExpense = vi.fn();

vi.mock('../../queries', () => ({
  getPayrollPersonById: (...args: unknown[]) => getPayrollPersonById(...args),
  getPositionById: (...args: unknown[]) => getPositionById(...args),
  listPayrollDuplicateCandidates: (...args: unknown[]) =>
    listPayrollDuplicateCandidates(...args),
  createPayrollExpense: (...args: unknown[]) => createPayrollExpense(...args),
  updatePayrollExpense: (...args: unknown[]) => updatePayrollExpense(...args),
  getPayrollExpenseById: (...args: unknown[]) => getPayrollExpenseById(...args),
  softDeletePayrollExpense: (...args: unknown[]) => softDeletePayrollExpense(...args),
  createEmployee: vi.fn(),
  createPosition: vi.fn(),
}));

const syncPayrollFinancialEntry = vi.fn();
const removePayrollFinancialEntries = vi.fn();

vi.mock('../../services/payroll-financial.service', () => ({
  syncPayrollFinancialEntry: (...args: unknown[]) => syncPayrollFinancialEntry(...args),
  removePayrollFinancialEntries: (...args: unknown[]) =>
    removePayrollFinancialEntries(...args),
}));

const {
  createPayrollExpenseAction,
  deletePayrollExpenseAction,
  updatePayrollExpenseAction,
} = await import('../payroll-actions');

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    personKind: 'employee',
    personId: PERSON_ID,
    costCenterId: COST_CENTER_ID,
    competence: '2026-03',
    expenseType: 'salario',
    amount: 3200,
    dueDate: '2026-04-05',
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
  });
  isPortalOwner.mockResolvedValue(false);
  assertCompanyPermission.mockResolvedValue(true);
  getPayrollPersonById.mockResolvedValue({
    id: PERSON_ID,
    kind: 'driver',
    name: 'JOÃO SILVA',
    positionId: null,
    costCenterId: null,
    active: true,
  });
  getCostCenterById.mockResolvedValue({id: COST_CENTER_ID, code: 'RH', name: 'RH'});
  listPayrollDuplicateCandidates.mockResolvedValue([]);
  createPayrollExpense.mockResolvedValue({id: 'expense-1'});
  updatePayrollExpense.mockResolvedValue({id: 'expense-1'});
  getPayrollExpenseById.mockResolvedValue({id: 'expense-1'});
  syncPayrollFinancialEntry.mockResolvedValue(undefined);
  removePayrollFinancialEntries.mockResolvedValue(undefined);
  softDeletePayrollExpense.mockResolvedValue(undefined);
}

beforeEach(() => {
  vi.clearAllMocks();
  grantAccess();
});

describe('permissões', () => {
  it('exige financeiro:create para criar', async () => {
    await createPayrollExpenseAction(validInput());
    expect(assertCompanyPermission).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'financeiro:create',
    );
  });

  it('exige financeiro:update para atualizar', async () => {
    await updatePayrollExpenseAction('expense-1', validInput());
    expect(assertCompanyPermission).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'financeiro:update',
    );
  });

  it('exige financeiro:delete para excluir', async () => {
    await deletePayrollExpenseAction('expense-1');
    expect(assertCompanyPermission).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'financeiro:delete',
    );
  });

  it('nega a operação sem a permissão e não escreve nada', async () => {
    assertCompanyPermission.mockResolvedValue(false);

    const result = await createPayrollExpenseAction(validInput());

    expect(result).toEqual({success: false, error: COMPANY_ACCESS_DENIED});
    expect(createPayrollExpense).not.toHaveBeenCalled();
    expect(syncPayrollFinancialEntry).not.toHaveBeenCalled();
  });

  it('nega quando o usuário não é membro da empresa', async () => {
    getCompanyAccessContext.mockResolvedValue(null);

    const result = await createPayrollExpenseAction(validInput());

    expect(result).toEqual({success: false, error: COMPANY_ACCESS_DENIED});
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('nega a exclusão sem permissão, sem estornar o lançamento', async () => {
    assertCompanyPermission.mockResolvedValue(false);

    const result = await deletePayrollExpenseAction('expense-1');

    expect(result.success).toBe(false);
    expect(removePayrollFinancialEntries).not.toHaveBeenCalled();
    expect(softDeletePayrollExpense).not.toHaveBeenCalled();
  });
});

describe('isolamento por empresa', () => {
  it('usa a empresa da sessão e ignora company_id enviado pelo client', async () => {
    await createPayrollExpenseAction(
      validInput({companyId: OTHER_COMPANY_ID, company_id: OTHER_COMPANY_ID}),
    );

    expect(createPayrollExpense).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      expect.anything(),
      PROFILE_ID,
    );
    const payload = createPayrollExpense.mock.calls[0][2];
    expect(payload).not.toHaveProperty('companyId');
    expect(payload).not.toHaveProperty('company_id');
  });

  it('falha quando não há empresa no contexto', async () => {
    getCurrentCompanyId.mockResolvedValue(null);

    const result = await createPayrollExpenseAction(validInput());

    expect(result).toEqual({success: false, error: 'Empresa não encontrada.'});
  });

  it('rejeita funcionário que não pertence à empresa da sessão', async () => {
    getPayrollPersonById.mockResolvedValue(null);

    const result = await createPayrollExpenseAction(validInput());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.personId).toBeDefined();
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('rejeita centro de custo que não pertence à empresa da sessão', async () => {
    getCostCenterById.mockResolvedValue(null);

    const result = await createPayrollExpenseAction(validInput());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.costCenterId).toBeDefined();
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('resolve a origem da pessoa no servidor, ignorando o personKind do client', async () => {
    await createPayrollExpenseAction(validInput({personKind: 'employee'}));

    // getPayrollPersonById devolveu kind = 'driver'.
    expect(createPayrollExpense.mock.calls[0][2].personKind).toBe('driver');
  });

  it('busca a despesa a excluir sempre escopada na empresa da sessão', async () => {
    await deletePayrollExpenseAction('expense-1');

    expect(getPayrollExpenseById).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'expense-1',
    );
  });
});

describe('Master em contexto de empresa', () => {
  it('opera sem company_members quando atua na empresa selecionada', async () => {
    getCurrentCompanyId.mockResolvedValue(SESSION_COMPANY_ID);
    getCompanyAccessContext.mockResolvedValue({
      companyId: SESSION_COMPANY_ID,
      profileId: 'master-profile',
      roleId: '',
      defaultBranchId: null,
      isMasterActing: true,
    });
    isPortalOwner.mockResolvedValue(true);

    const result = await createPayrollExpenseAction(validInput());

    expect(result.success).toBe(true);
    expect(createPayrollExpense).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      expect.anything(),
      'master-profile',
    );
  });

  it('não opera sem empresa selecionada', async () => {
    getCurrentCompanyId.mockResolvedValue(null);

    const result = await createPayrollExpenseAction(validInput());

    expect(result).toEqual({success: false, error: 'Empresa não encontrada.'});
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('não usa membership residual de Master sem contexto', async () => {
    getCurrentCompanyId.mockResolvedValue(SESSION_COMPANY_ID);
    getCompanyAccessContext.mockResolvedValue({
      companyId: SESSION_COMPANY_ID,
      profileId: 'master-profile',
      roleId: 'role-1',
      defaultBranchId: null,
      isMasterActing: false,
    });
    isPortalOwner.mockResolvedValue(true);

    const result = await createPayrollExpenseAction(validInput());

    expect(result).toEqual({success: false, error: COMPANY_ACCESS_DENIED});
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('não aceita contexto de outra empresa', async () => {
    getCurrentCompanyId.mockResolvedValue(SESSION_COMPANY_ID);
    getCompanyAccessContext.mockResolvedValue({
      companyId: OTHER_COMPANY_ID,
      profileId: 'master-profile',
      roleId: '',
      defaultBranchId: null,
      isMasterActing: true,
    });
    isPortalOwner.mockResolvedValue(true);

    const result = await createPayrollExpenseAction(validInput());

    expect(result).toEqual({success: false, error: COMPANY_ACCESS_DENIED});
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });
});

describe('duplicidade suave', () => {
  it('pede confirmação quando existe despesa semelhante', async () => {
    listPayrollDuplicateCandidates.mockResolvedValue([
      {
        id: 'expense-existente',
        personId: PERSON_ID,
        competence: '2026-03-01',
        expenseType: 'salario',
      },
    ]);

    const result = await createPayrollExpenseAction(validInput());

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.confirmDuplicate).toContain('Confirme');
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('grava normalmente após a confirmação explícita', async () => {
    listPayrollDuplicateCandidates.mockResolvedValue([
      {
        id: 'expense-existente',
        personId: PERSON_ID,
        competence: '2026-03-01',
        expenseType: 'salario',
      },
    ]);

    const result = await createPayrollExpenseAction(
      validInput({confirmDuplicate: true}),
    );

    expect(result.success).toBe(true);
    expect(createPayrollExpense).toHaveBeenCalledTimes(1);
    // Confirmado, a checagem nem é consultada.
    expect(listPayrollDuplicateCandidates).not.toHaveBeenCalled();
  });

  it('não acusa duplicidade contra o próprio registro em edição', async () => {
    listPayrollDuplicateCandidates.mockResolvedValue([
      {
        id: 'expense-1',
        personId: PERSON_ID,
        competence: '2026-03-01',
        expenseType: 'salario',
      },
    ]);

    const result = await updatePayrollExpenseAction('expense-1', validInput());

    expect(result.success).toBe(true);
    expect(updatePayrollExpense).toHaveBeenCalledTimes(1);
  });
});

describe('integração financeira', () => {
  it('sincroniza o lançamento após criar', async () => {
    await createPayrollExpenseAction(validInput());

    expect(syncPayrollFinancialEntry).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      {id: 'expense-1'},
      PROFILE_ID,
    );
  });

  it('sincroniza o lançamento após editar, sem duplicar', async () => {
    await updatePayrollExpenseAction('expense-1', validInput());

    expect(syncPayrollFinancialEntry).toHaveBeenCalledTimes(1);
  });

  it('bloqueia paid → pending para não corromper a baixa', async () => {
    getPayrollExpenseById.mockResolvedValue({
      id: 'expense-1',
      expenseStatus: 'paid',
    });

    const result = await updatePayrollExpenseAction(
      'expense-1',
      validInput({expenseStatus: 'pending'}),
    );

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain('voltar uma despesa de pessoal paga para pendente');
    expect(updatePayrollExpense).not.toHaveBeenCalled();
    expect(syncPayrollFinancialEntry).not.toHaveBeenCalled();
  });

  it('estorna o lançamento antes de arquivar a despesa', async () => {
    const order: string[] = [];
    removePayrollFinancialEntries.mockImplementation(async () => {
      order.push('remove-financial');
    });
    softDeletePayrollExpense.mockImplementation(async () => {
      order.push('soft-delete');
    });

    const result = await deletePayrollExpenseAction('expense-1');

    expect(result.success).toBe(true);
    expect(order).toEqual(['remove-financial', 'soft-delete']);
  });

  it('falha na integração retorna erro e não informa sucesso', async () => {
    syncPayrollFinancialEntry.mockRejectedValue(new Error('financeiro indisponível'));

    const result = await createPayrollExpenseAction(validInput());

    expect(result).toEqual({success: false, error: 'financeiro indisponível'});
    expect(softDeletePayrollExpense).toHaveBeenCalledWith(
      supabaseStub,
      SESSION_COMPANY_ID,
      'expense-1',
      PROFILE_ID,
    );
  });
});

describe('validação', () => {
  it('não grava com valor zero', async () => {
    const result = await createPayrollExpenseAction(validInput({amount: 0}));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.amount).toBeDefined();
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('não grava sem centro de custo', async () => {
    const input = validInput();
    delete (input as Record<string, unknown>).costCenterId;

    const result = await createPayrollExpenseAction(input);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.costCenterId).toBeDefined();
    expect(createPayrollExpense).not.toHaveBeenCalled();
  });

  it('não grava despesa em aberto sem vencimento', async () => {
    const result = await createPayrollExpenseAction(validInput({dueDate: null}));

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.fieldErrors?.dueDate).toBeDefined();
  });
});
