import {describe, expect, it, vi} from 'vitest';

import {MappedDatabaseError} from '@/features/master/companies/utils/database-error';

import {createDriver} from '../drivers';

function fakeSupabaseInsertError(error: {code?: string; message: string}) {
  const single = vi.fn(async () => ({data: null, error}));
  const select = vi.fn(() => ({single}));
  const insert = vi.fn(() => ({select}));
  const from = vi.fn(() => ({insert}));
  return {from, insert, select, single};
}

describe('createDriver — diagnóstico técnico sanitizado', () => {
  it('lança MappedDatabaseError com code/category e message de produto', async () => {
    const client = fakeSupabaseInsertError({
      code: '23514',
      message: 'new row for relation "drivers" violates check constraint — cpf 529.982.247-25',
    });

    await expect(
      createDriver(
        client as never,
        'company-1',
        {
          name: 'MOTORISTA HML',
          cpf: '00000000000',
          cnhNumber: 'HML00000001',
          licenseCategory: 'C',
          licenseExpiresAt: '2030-12-31',
          operationalStatus: 'active',
          phone: '11999999999',
        } as never,
        'profile-1',
      ),
    ).rejects.toBeInstanceOf(MappedDatabaseError);

    try {
      await createDriver(
        client as never,
        'company-1',
        {
          name: 'MOTORISTA HML',
          cpf: '00000000000',
          cnhNumber: 'HML00000001',
          licenseCategory: 'C',
          licenseExpiresAt: '2030-12-31',
          operationalStatus: 'active',
          phone: '11999999999',
        } as never,
        'profile-1',
      );
    } catch (error) {
      const mapped = error as MappedDatabaseError;
      expect(mapped.message).toBe('Não foi possível concluir a operação.');
      expect(mapped.code).toBe('23514');
      expect(mapped.category).toBe('check_violation');
      expect(mapped.safeDiagnostic).toContain('code=23514');
      expect(mapped.safeDiagnostic).not.toMatch(/529/);
      expect(mapped.safeDiagnostic).not.toMatch(/password|token|service_role/i);
    }
  });

  it('conflito de unicidade de CPF mantém mensagem amigável e code 23505', async () => {
    const client = fakeSupabaseInsertError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "idx_drivers_company_cpf_active"',
    });

    try {
      await createDriver(
        client as never,
        'company-1',
        {
          name: 'MOTORISTA HML',
          cpf: '00000000000',
          cnhNumber: 'HML00000001',
          licenseCategory: 'C',
          operationalStatus: 'active',
        } as never,
        'profile-1',
      );
      expect.unreachable('deveria falhar');
    } catch (error) {
      const mapped = error as MappedDatabaseError;
      expect(mapped.message).toBe('Este CPF já está cadastrado nesta empresa.');
      expect(mapped.code).toBe('23505');
      expect(mapped.category).toBe('unique_violation');
    }
  });
});
