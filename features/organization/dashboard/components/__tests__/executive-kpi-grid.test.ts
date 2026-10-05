import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';

import {EXECUTIVE_OPEN_BALANCE_META} from '../../loaders/executive-dashboard-loader';

const componentSource = [
  'features/organization/dashboard/components/executive-kpi-grid.tsx',
  'features/organization/dashboard/utils/executive-kpi-display.ts',
]
  .map((file) => readFileSync(resolve(process.cwd(), file), 'utf8'))
  .join('\n');

describe('ExecutiveKpiGrid copy contract', () => {
  it('separa P&L do período da posição financeira company-wide', () => {
    expect(componentSource).toContain('Receita Total');
    expect(componentSource).toContain('Custos Totais');
    expect(componentSource).toContain('Posição financeira da empresa');
    expect(componentSource).toContain(
      'Saldo em aberto • empresa inteira • independente dos filtros',
    );
    expect(componentSource).toContain('Saldo em aberto — Contas a Pagar');
    expect(componentSource).toContain('Saldo em aberto — Contas a Receber');
  });

  it('não apresenta AP/AR como valores do período filtrado', () => {
    expect(componentSource.toLowerCase()).not.toMatch(
      /contas a pagar[\s\S]{0,120}do período/,
    );
    expect(componentSource.toLowerCase()).not.toMatch(
      /contas a receber[\s\S]{0,120}do período/,
    );
    expect(componentSource).toContain('independente dos filtros');
    expect(componentSource).toContain('Empresa inteira • sem folha');
    expect(componentSource).not.toContain('subtitle="Saldo aberto"');
  });

  it('deixa explícito payroll no custo DRE e fora do AP', () => {
    expect(componentSource).toContain(
      'Total DRE = atribuídos + não atribuíveis; rankings usam só atribuídos',
    );
    expect(componentSource).toContain('Empresa inteira • sem folha');
    expect(EXECUTIVE_OPEN_BALANCE_META.includesPayroll).toBe(false);
  });
});
