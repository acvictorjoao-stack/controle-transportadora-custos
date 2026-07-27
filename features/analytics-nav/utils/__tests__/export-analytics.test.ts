import {describe, expect, it} from 'vitest';

import {analyticsPayloadToCsv} from '../export-analytics';

describe('export analytics', () => {
  it('gera CSV com KPIs e ranking', () => {
    const csv = analyticsPayloadToCsv({
      title: 'Rentabilidade',
      kpis: [{label: 'Receita', value: 'R$ 10'}],
      columns: [
        {id: 'name', header: 'Cliente'},
        {id: 'profit', header: 'Lucro'},
      ],
      rows: [{name: 'Mateus', profit: 310}],
    });

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('KPI;Valor');
    expect(csv).toContain('Receita;R$ 10');
    expect(csv).toContain('Cliente;Lucro');
    expect(csv).toContain('Mateus;310');
  });
});
