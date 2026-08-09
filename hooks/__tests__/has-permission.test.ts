import {describe, expect, it} from 'vitest';

import {hasPermission} from '@/lib/navigation/has-permission';

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
});
