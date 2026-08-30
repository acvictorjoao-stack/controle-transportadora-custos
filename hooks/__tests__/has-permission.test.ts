import {describe, expect, it} from 'vitest';

import {hasPermission} from '@/lib/navigation/has-permission';
import type {Permission} from '@/types/global/navigation';

describe('hasPermission nav aliases (business roles)', () => {
  it('lets Financeiro open the Dashboard group via financeiro:read', () => {
    expect(hasPermission('dashboard:read', ['financeiro:read'])).toBe(true);
  });

  it('still opens Dashboard for operational reads', () => {
    expect(hasPermission('dashboard:read', ['trips:read'])).toBe(true);
  });

  it('hides Financeiro module without financial permission', () => {
    expect(hasPermission('financeiro:read', ['trips:read'])).toBe(false);
  });

  it('hides Manutenções without maintenance:read', () => {
    expect(hasPermission('maintenance:read', ['fuel:read'])).toBe(false);
  });

  it('mantém usuário somente leitura sem ações de escrita na folha', () => {
    const permissions: Permission[] = ['financeiro:read'];

    expect(hasPermission('financeiro:read', permissions)).toBe(true);
    expect(hasPermission('financeiro:create', permissions)).toBe(false);
    expect(hasPermission('financeiro:update', permissions)).toBe(false);
    expect(hasPermission('financeiro:delete', permissions)).toBe(false);
  });

  it('mantém o acesso elevado do Master em contexto pelo wildcard existente', () => {
    expect(hasPermission('financeiro:create', ['*'])).toBe(true);
    expect(hasPermission('financeiro:update', ['*'])).toBe(true);
    expect(hasPermission('financeiro:delete', ['*'])).toBe(true);
  });
});
