import {describe, expect, it} from 'vitest';

import {
  MappedDatabaseError,
  classifyDatabaseError,
  formatAbortReasonFromUnknown,
  formatSafeDatabaseDiagnostic,
  mapDatabaseError,
  sanitizeDatabaseErrorText,
  toMappedDatabaseError,
} from '../database-error';

describe('database-error — classificação sem inventar causa', () => {
  it('classifica apenas códigos comprovados', () => {
    expect(classifyDatabaseError({code: '23505', message: 'x'})).toBe('unique_violation');
    expect(classifyDatabaseError({code: '23503', message: 'x'})).toBe('foreign_key_violation');
    expect(classifyDatabaseError({code: '23514', message: 'x'})).toBe('check_violation');
    expect(classifyDatabaseError({code: '23502', message: 'x'})).toBe('not_null_violation');
    expect(classifyDatabaseError({code: '42501', message: 'permission denied'})).toBe(
      'insufficient_privilege',
    );
    expect(classifyDatabaseError({code: 'P0001', message: 'raised'})).toBe('raise_exception');
    expect(classifyDatabaseError({code: 'PGRST116', message: 'no rows'})).toBe('postgrest_no_rows');
    expect(classifyDatabaseError({code: 'XX000', message: 'something else'})).toBe('unknown');
  });

  it('só marca RLS quando a mensagem comprova', () => {
    expect(
      classifyDatabaseError({
        code: '42501',
        message: 'new row violates row-level security policy for table drivers',
      }),
    ).toBe('rls_or_permission');
    expect(
      classifyDatabaseError({
        code: '42501',
        message: 'permission denied for table drivers',
      }),
    ).toBe('insufficient_privilege');
  });
});

describe('database-error — sanitização de PII/segredos', () => {
  it('remove CPF, dígitos longos, e-mail, jwt e chaves', () => {
    const raw =
      'duplicate key cpf=529.982.247-25 cnh=12345678901 doc=123456789012345 email=ana.hml@example.com ' +
      'bearer=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb sb_publishable_ABC123 service_role password=secret';
    const sanitized = sanitizeDatabaseErrorText(raw);
    expect(sanitized).not.toMatch(/529/);
    expect(sanitized).not.toMatch(/12345678901/);
    expect(sanitized).not.toMatch(/123456789012345/);
    expect(sanitized).not.toMatch(/ana\.hml@example\.com/i);
    expect(sanitized).not.toMatch(/eyJhbGci/i);
    expect(sanitized).not.toMatch(/sb_publishable_/i);
    expect(sanitized).not.toMatch(/service_role/i);
    expect(sanitized).not.toMatch(/secret/i);
    expect(sanitized).toContain('[cpf]');
    expect(sanitized).toContain('[digits]');
    expect(sanitized).toContain('[email]');
    expect(sanitized).toContain('[jwt]');
    expect(sanitized).toContain('[key]');
    expect(sanitized).toContain('[redacted]');
  });

  it('formatSafeDatabaseDiagnostic não inclui details/payloads brutos', () => {
    const diagnostic = formatSafeDatabaseDiagnostic({
      code: '23503',
      message: 'insert or update on table "drivers" violates foreign key — cpf 52998224725',
    });
    expect(diagnostic).toContain('code=23503');
    expect(diagnostic).toContain('category=foreign_key_violation');
    expect(diagnostic).not.toMatch(/52998224725/);
    expect(diagnostic).not.toMatch(/details=/i);
  });
});

describe('database-error — MappedDatabaseError preserva UX', () => {
  it('mantém mensagem de produto e anexa diagnóstico seguro', () => {
    const mapped = toMappedDatabaseError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "idx_drivers_company_cpf_active"',
    });
    expect(mapped).toBeInstanceOf(MappedDatabaseError);
    expect(mapped.message).toBe('Este CPF já está cadastrado nesta empresa.');
    expect(mapped.userMessage).toBe(mapDatabaseError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "idx_drivers_company_cpf_active"',
    }));
    expect(mapped.code).toBe('23505');
    expect(mapped.category).toBe('unique_violation');
    expect(mapped.safeDiagnostic).toContain('code=23505');

    const abortReason = formatAbortReasonFromUnknown(mapped);
    expect(abortReason).toContain('Este CPF já está cadastrado nesta empresa.');
    expect(abortReason).toContain('code=23505');
    expect(abortReason).not.toMatch(/\d{11}/);
  });

  it('erro genérico preserva código técnico desconhecido sem inventar causa', () => {
    const mapped = toMappedDatabaseError({
      code: '42P01',
      message: 'relation drivers does not exist',
    });
    expect(mapped.message).toBe('Não foi possível concluir a operação.');
    expect(mapped.category).toBe('unknown');
    expect(mapped.code).toBe('42P01');
    expect(mapped.safeDiagnostic).toContain('category=unknown');
  });
});
