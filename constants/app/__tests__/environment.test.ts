import {describe, expect, it} from 'vitest';

import {resolveAppEnvironmentLabel} from '../environment';

describe('resolveAppEnvironmentLabel', () => {
  it('maps production env to Produção', () => {
    expect(
      resolveAppEnvironmentLabel({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'production',
      } as NodeJS.ProcessEnv),
    ).toBe('Produção');
  });

  it('maps development/test to Teste', () => {
    expect(
      resolveAppEnvironmentLabel({
        NODE_ENV: 'development',
      } as NodeJS.ProcessEnv),
    ).toBe('Teste');
    expect(
      resolveAppEnvironmentLabel({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'staging',
      } as NodeJS.ProcessEnv),
    ).toBe('Teste');
  });
});
