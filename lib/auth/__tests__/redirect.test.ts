import {describe, expect, it} from 'vitest';

import {ROUTES} from '@/constants/routes/paths';
import {resolvePostLoginRedirect} from '@/lib/auth/redirect';

describe('resolvePostLoginRedirect', () => {
  it('sends Master to access choice screen by default', () => {
    expect(resolvePostLoginRedirect(null, true)).toBe(ROUTES.acesso);
    expect(resolvePostLoginRedirect('/dashboard', true)).toBe(ROUTES.acesso);
  });

  it('allows Master returnTo for master and acesso routes', () => {
    expect(resolvePostLoginRedirect(ROUTES.master, true)).toBe(ROUTES.master);
    expect(resolvePostLoginRedirect(ROUTES.acessoEmpresas, true)).toBe(
      ROUTES.acessoEmpresas,
    );
  });

  it('blocks tenant users from master and acesso routes', () => {
    expect(resolvePostLoginRedirect(ROUTES.master, false)).toBe(ROUTES.home);
    expect(resolvePostLoginRedirect(ROUTES.acesso, false)).toBe(ROUTES.home);
  });

  it('keeps safe returnTo for tenant users', () => {
    expect(resolvePostLoginRedirect('/veiculos', false)).toBe('/veiculos');
  });
});
