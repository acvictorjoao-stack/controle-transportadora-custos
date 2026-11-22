import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

/**
 * Fase 2.2.2 — As funções da Vercel rodam perto do banco.
 *
 * O Supabase do FleetControl fica em São Paulo (sa-east-1). Sem região
 * definida, a Vercel executava as funções em iad1 (Washington) e cada consulta
 * atravessava o continente (~120 ms ida e volta), o que somava ~2 s fixos por
 * página. gru1 é a região da Vercel em São Paulo.
 */
describe('Fase 2.2.2 — região das funções', () => {
  const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8')) as {
    regions?: string[];
    [key: string]: unknown;
  };

  it('fixa as funções em gru1 (São Paulo), a mesma região do Supabase', () => {
    expect(config.regions).toEqual(['gru1']);
  });

  it('vercel.json só define a região (nada de cron, rewrites ou headers escondidos aqui)', () => {
    expect(Object.keys(config).sort()).toEqual(['$schema', 'regions']);
  });
});
