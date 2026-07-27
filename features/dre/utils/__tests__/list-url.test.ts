import {describe, expect, it} from 'vitest';

import {
  buildOperationalDreUrl,
  parseOperationalDreFilters,
  resolvePeriodPreset,
} from '../list-url';

describe('list-url shared analytics filters (RC 27.6.0)', () => {
  it('serializa filtros compartilhados na URL', () => {
    const url = buildOperationalDreUrl(
      {
        branchId: 'b1',
        customerId: 'c1',
        routeId: 'r1',
        vehicleId: 'v1',
        driverId: 'd1',
        costCenterId: 'cc1',
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      },
      '/dashboard/rentabilidade/clientes',
    );

    expect(url).toContain('empresa=b1');
    expect(url).toContain('filial=b1');
    expect(url).toContain('cliente=c1');
    expect(url).toContain('rota=r1');
    expect(url).toContain('veiculo=v1');
    expect(url).toContain('motorista=d1');
    expect(url).toContain('centro=cc1');
    expect(url).toContain('de=2026-01-01');
    expect(url).toContain('ate=2026-01-31');
  });

  it('restaura estado a partir de query string', () => {
    const filters = parseOperationalDreFilters({
      empresa: '1',
      periodo: '30d',
      cliente: 'XPTO',
      veiculo: 'ABC',
      motorista: 'DRV',
    });

    expect(filters.branchId).toBe('1');
    expect(filters.customerId).toBe('XPTO');
    expect(filters.vehicleId).toBe('ABC');
    expect(filters.driverId).toBe('DRV');
    expect(filters.dateFrom).toBeTruthy();
    expect(filters.dateTo).toBeTruthy();
  });

  it('prioriza filial sobre empresa', () => {
    const filters = parseOperationalDreFilters({
      empresa: 'old',
      filial: 'new',
    });
    expect(filters.branchId).toBe('new');
  });

  it('resolve periodo=30d', () => {
    const period = resolvePeriodPreset('30d');
    expect(period).not.toBeNull();
    expect(period?.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(period?.dateTo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('serializa atalho periodo sem de/ate', () => {
    const url = buildOperationalDreUrl(
      {customerId: 'XPTO'},
      '/dashboard/rentabilidade/clientes',
      {periodo: '30d'},
    );
    expect(url).toBe(
      '/dashboard/rentabilidade/clientes?cliente=XPTO&periodo=30d',
    );
  });
});
