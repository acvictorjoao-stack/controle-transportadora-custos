import {describe, expect, it} from 'vitest';

import {provisionCompanyAdministratorSchema} from '../../validation/schemas';

describe('provisionCompanyAdministratorSchema', () => {
  it('aceita nome e e-mail válidos', () => {
    const parsed = provisionCompanyAdministratorSchema.safeParse({
      fullName: 'Administrador Demo',
      email: 'demo.admin@fleetcontrol.local',
    });

    expect(parsed.success).toBe(true);
  });

  it('rejeita e-mail inválido', () => {
    const parsed = provisionCompanyAdministratorSchema.safeParse({
      fullName: 'Administrador Demo',
      email: 'invalido',
    });

    expect(parsed.success).toBe(false);
  });
});
