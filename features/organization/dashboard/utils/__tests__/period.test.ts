import {describe, expect, it} from 'vitest';

import {buildCrossNavHref} from '@/features/analytics-nav/utils/shared-filters';
import {ROUTES} from '@/constants/routes/paths';
import {buildOperationalDreUrl} from '@/features/dre/utils/list-url';
import {EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS} from '@/features/dre/utils/empty-state';

import {
  currentMonthFilters,
  formatEntityFilterSummary,
  formatPeriodRangeLabel,
  resolveExecutiveDashboardFilters,
} from '../period';

describe('resolveExecutiveDashboardFilters', () => {
  it('sem query usa o mês corrente', () => {
    const fallback = currentMonthFilters();
    expect(resolveExecutiveDashboardFilters({})).toEqual(fallback);
    expect(resolveExecutiveDashboardFilters()).toEqual(fallback);
  });

  it('respeita de/ate da URL', () => {
    expect(
      resolveExecutiveDashboardFilters({
        de: '2026-09-01',
        ate: '2026-09-30',
      }),
    ).toEqual({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    });
  });

  it('aplica filial, cliente, rota, veículo, motorista e centro', () => {
    const filters = resolveExecutiveDashboardFilters({
      filial: 'branch-1',
      cliente: 'customer-1',
      rota: 'route-1',
      veiculo: 'vehicle-1',
      motorista: 'driver-1',
      centro: 'cc-1',
    });
    const fallback = currentMonthFilters();

    expect(filters).toEqual({
      branchId: 'branch-1',
      customerId: 'customer-1',
      routeId: 'route-1',
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      costCenterId: 'cc-1',
      dateFrom: fallback.dateFrom,
      dateTo: fallback.dateTo,
    });
  });

  it('combina período personalizado com entidades', () => {
    const filters = resolveExecutiveDashboardFilters({
      de: '2026-08-01',
      ate: '2026-08-15',
      filial: 'branch-1',
      cliente: 'customer-1',
      rota: 'route-1',
      veiculo: 'vehicle-1',
      motorista: 'driver-1',
    });

    expect(filters).toEqual({
      branchId: 'branch-1',
      customerId: 'customer-1',
      routeId: 'route-1',
      vehicleId: 'vehicle-1',
      driverId: 'driver-1',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-15',
    });
  });

  it('prioriza filial sobre empresa', () => {
    expect(
      resolveExecutiveDashboardFilters({
        empresa: 'old',
        filial: 'new',
      }).branchId,
    ).toBe('new');
  });

  it('não usa company_id da query', () => {
    const filters = resolveExecutiveDashboardFilters({
      de: '2026-09-01',
      ate: '2026-09-02',
      ...({company_id: 'outra-empresa'} as {company_id: string}),
    });

    expect(filters).toEqual({
      dateFrom: '2026-09-01',
      dateTo: '2026-09-02',
    });
    expect(filters).not.toHaveProperty('company_id');
  });

  it('resolve periodo=hoje sem mascarar 30d', () => {
    const fromHoje = resolveExecutiveDashboardFilters({periodo: 'hoje'});
    expect(fromHoje.dateFrom).toBe(fromHoje.dateTo);
    expect(fromHoje.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const from30 = resolveExecutiveDashboardFilters({periodo: '30d'});
    expect(from30.dateFrom).not.toBe(fromHoje.dateFrom);
    expect(from30.dateFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('dashboard filter URL', () => {
  it('serializa de/ate e entidades no path do dashboard', () => {
    const url = buildOperationalDreUrl(
      {
        branchId: 'b1',
        customerId: 'c1',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
      },
      ROUTES.dashboard,
    );

    expect(url).toBe(
      '/dashboard?empresa=b1&filial=b1&cliente=c1&de=2026-09-01&ate=2026-09-30',
    );
  });

  it('preserva recorte ao ir para rentabilidade (buildCrossNavHref)', () => {
    const href = buildCrossNavHref(
      'rentabilidade-rotas',
      {
        branchId: 'b1',
        dateFrom: '2026-09-01',
        dateTo: '2026-09-30',
      },
      {routeId: 'r1'},
    );
    expect(href).toContain('/dashboard/rentabilidade/rotas');
    expect(href).toContain('filial=b1');
    expect(href).toContain('rota=r1');
    expect(href).toContain('de=2026-09-01');
    expect(href).toContain('ate=2026-09-30');
  });
});

describe('rótulos do recorte', () => {
  it('formata período em pt-BR', () => {
    expect(
      formatPeriodRangeLabel({dateFrom: '2026-09-01', dateTo: '2026-09-30'}),
    ).toBe('01/09/2026 – 30/09/2026');
  });

  it('resume entidades sem poluir quando não há filtro', () => {
    expect(
      formatEntityFilterSummary({}, EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS),
    ).toBe('');
  });

  it('resume filial e cliente quando há opções', () => {
    expect(
      formatEntityFilterSummary(
        {branchId: 'b1', customerId: 'c1'},
        {
          ...EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS,
          branches: [{id: 'b1', name: 'São Luís', code: 'SLZ'}],
          customers: [{id: 'c1', name: 'Mineração'}],
        },
      ),
    ).toBe('Filial: São Luís · Cliente: Mineração');
  });
});
