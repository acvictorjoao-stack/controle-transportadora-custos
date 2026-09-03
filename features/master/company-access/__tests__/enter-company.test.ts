import {beforeEach, describe, expect, it, vi} from 'vitest';

import {PORTAL_ACCESS_DENIED} from '@/lib/auth/guards';

const guardPortalOwner = vi.fn();
const setMasterActingCompany = vi.fn();
const logPortalAudit = vi.fn();
const revalidatePath = vi.fn();
const redirect = vi.fn();
const getUser = vi.fn();

vi.mock('@/lib/auth/guards', () => ({
  PORTAL_ACCESS_DENIED: 'Acesso negado.',
  guardPortalOwner: (...args: unknown[]) => guardPortalOwner(...args),
}));

vi.mock('@/lib/auth/master-company-context', () => ({
  setMasterActingCompany: (...args: unknown[]) => setMasterActingCompany(...args),
  clearMasterActingCompany: vi.fn(),
}));

vi.mock('@/features/master/audit', () => ({
  logPortalAudit: (...args: unknown[]) => logPortalAudit(...args),
  PORTAL_AUDIT_ACTIONS: {
    COMPANY_ACCESS: 'company_access',
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => {
    redirect(...args);
    throw new Error('NEXT_REDIRECT');
  },
}));

vi.mock('@/supabase/server', () => ({
  createClient: async () => ({
    auth: {getUser},
  }),
}));

const {enterCompanyAsMasterAction} = await import('../actions');

const COMPANY = {
  companyId: 'company-a',
  companyName: 'Transportadora Alfa',
};

beforeEach(() => {
  vi.clearAllMocks();
  guardPortalOwner.mockResolvedValue(true);
  getUser.mockResolvedValue({
    data: {user: {id: 'owner-1', email: 'owner@fleetcontrol.local'}},
  });
  setMasterActingCompany.mockResolvedValue({ok: true, company: COMPANY});
  logPortalAudit.mockResolvedValue(undefined);
});

describe('enterCompanyAsMasterAction', () => {
  it('permite entrar em empresa ativa e audita company_access', async () => {
    await expect(enterCompanyAsMasterAction(COMPANY.companyId)).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(setMasterActingCompany).toHaveBeenCalledWith(
      COMPANY.companyId,
      expect.anything(),
    );
    expect(logPortalAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'company_access',
        targetId: COMPANY.companyId,
        metadata: {mode: 'enter'},
      }),
    );
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('bloqueia OWNER sem permissão', async () => {
    guardPortalOwner.mockResolvedValue(false);

    const result = await enterCompanyAsMasterAction(COMPANY.companyId);

    expect(result).toEqual({success: false, error: PORTAL_ACCESS_DENIED});
    expect(setMasterActingCompany).not.toHaveBeenCalled();
    expect(logPortalAudit).not.toHaveBeenCalled();
  });

  it('rejeita empresa inativa com mensagem amigável', async () => {
    setMasterActingCompany.mockResolvedValue({
      ok: false,
      error: 'Empresa inativa. Selecione outra empresa.',
    });

    const result = await enterCompanyAsMasterAction(COMPANY.companyId);

    expect(result).toEqual({
      success: false,
      error: 'Empresa inativa. Selecione outra empresa.',
    });
    expect(logPortalAudit).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('rejeita empresa deletada ou inexistente', async () => {
    setMasterActingCompany.mockResolvedValue({
      ok: false,
      error: 'Empresa não encontrada ou acesso negado.',
    });

    const result = await enterCompanyAsMasterAction('missing-or-deleted');

    expect(result).toEqual({
      success: false,
      error: 'Empresa não encontrada ou acesso negado.',
    });
    expect(logPortalAudit).not.toHaveBeenCalled();
  });
});
