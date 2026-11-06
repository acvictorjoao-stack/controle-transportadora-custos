import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';

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

  it('mantém Produção na Vercel em produção', () => {
    expect(
      resolveAppEnvironmentLabel({
        NODE_ENV: 'production',
        NEXT_PUBLIC_VERCEL_ENV: 'production',
      }),
    ).toBe('Produção');
  });

  it('mostra Teste no Preview da Vercel, mesmo com NODE_ENV production', () => {
    expect(
      resolveAppEnvironmentLabel({
        NODE_ENV: 'production',
        NEXT_PUBLIC_VERCEL_ENV: 'preview',
      }),
    ).toBe('Teste');
  });

  it('prioriza NEXT_PUBLIC_APP_ENV sobre a Vercel', () => {
    expect(
      resolveAppEnvironmentLabel({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: 'staging',
        NEXT_PUBLIC_VERCEL_ENV: 'production',
      }),
    ).toBe('Teste');
  });

  it('usa NODE_ENV quando as variáveis explícitas estão vazias', () => {
    expect(
      resolveAppEnvironmentLabel({
        NODE_ENV: 'production',
        NEXT_PUBLIC_APP_ENV: '',
        NEXT_PUBLIC_VERCEL_ENV: '',
      }),
    ).toBe('Produção');
  });

  describe('sem ambiente injetado', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('lê NODE_ENV do processo', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_ENV', '');
      vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', '');
      vi.stubEnv('NODE_ENV', 'production');
      expect(resolveAppEnvironmentLabel()).toBe('Produção');
    });

    it('lê NEXT_PUBLIC_VERCEL_ENV do processo', () => {
      vi.stubEnv('NEXT_PUBLIC_APP_ENV', '');
      vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'preview');
      vi.stubEnv('NODE_ENV', 'production');
      expect(resolveAppEnvironmentLabel()).toBe('Teste');
    });
  });

  it('lê as variáveis de forma literal, para o Next.js embuti-las no navegador', () => {
    const source = readFileSync(resolve(process.cwd(), 'constants/app/environment.ts'), 'utf8');

    expect(source).toContain('NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV');
    expect(source).toContain('NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV');
    expect(source).toContain('NODE_ENV: process.env.NODE_ENV');
    expect(source).not.toMatch(/env: [^=]*= process\.env,/);
  });
});
