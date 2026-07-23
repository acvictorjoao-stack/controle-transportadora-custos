import {describe, expect, it} from 'vitest';

import {ROUTES} from '@/constants/routes/paths';

import {
  buildTripFinancialBreakdown,
  categorizeTripFinancialExpense,
  getTripFinancialCategoryEntries,
} from '../trip-financial-breakdown';
import type {TripFinancialBreakdownSourceRow} from '../../types/trip-financial-breakdown';
import {
  resolveTripFinancialOriginHref,
  resolveTripFinancialOriginLabel,
} from '../../utils/trip-financial-origin';

function makeRow(
  overrides: Partial<TripFinancialBreakdownSourceRow> = {},
): TripFinancialBreakdownSourceRow {
  return {
    id: 'entry-1',
    entryType: 'expense',
    entryStatus: 'paid',
    amount: 100,
    entryDate: '2026-07-22',
    description: 'Lançamento teste',
    referenceNumber: null,
    supplier: null,
    categoryName: null,
    categorySlug: null,
    sourceModule: null,
    sourceId: null,
    fuelRecordId: null,
    maintenanceRecordId: null,
    tireId: null,
    ...overrides,
  };
}

describe('categorizeTripFinancialExpense', () => {
  it('classifies by slug, FK and source_module', () => {
    expect(
      categorizeTripFinancialExpense(makeRow({categorySlug: 'combustivel'})),
    ).toBe('combustivel');
    expect(
      categorizeTripFinancialExpense(makeRow({fuelRecordId: 'fuel-1'})),
    ).toBe('combustivel');
    expect(
      categorizeTripFinancialExpense(makeRow({sourceModule: 'maintenance'})),
    ).toBe('manutencao');
    expect(categorizeTripFinancialExpense(makeRow({tireId: 'tire-1'}))).toBe(
      'pneus',
    );
    expect(
      categorizeTripFinancialExpense(makeRow({categorySlug: 'pedagio'})),
    ).toBe('pedagio');
    expect(
      categorizeTripFinancialExpense(makeRow({sourceModule: 'fines'})),
    ).toBe('multas');
    expect(categorizeTripFinancialExpense(makeRow({categorySlug: 'outros'}))).toBe(
      'outros',
    );
  });
});

describe('buildTripFinancialBreakdown', () => {
  it('calculates revenue, costs by category, profit and margin', () => {
    const breakdown = buildTripFinancialBreakdown(
      'trip-1',
      [
        makeRow({
          id: 'rev',
          entryType: 'revenue',
          amount: 9999,
          description: 'Receita lançamento (ignorada quando há frete oficial)',
        }),
        makeRow({
          id: 'fuel',
          amount: 980,
          categorySlug: 'combustivel',
          sourceModule: 'fuel',
          sourceId: 'fuel-1',
          fuelRecordId: 'fuel-1',
          supplier: 'Posto Ipiranga',
          referenceNumber: 'NF 44521',
          description: 'Diesel S10',
          entryDate: '2026-07-22',
        }),
        makeRow({
          id: 'maint',
          amount: 320,
          categorySlug: 'manutencao',
          sourceModule: 'maintenance',
          sourceId: 'maint-1',
          maintenanceRecordId: 'maint-1',
          supplier: 'Oficina XPTO',
          description: 'Troca de óleo',
        }),
        makeRow({
          id: 'tire',
          amount: 90,
          categorySlug: 'pneus',
          sourceModule: 'tires',
          sourceId: 'tire-1',
          tireId: 'tire-1',
          description: 'Michelin X Multi',
        }),
        makeRow({
          id: 'toll',
          amount: 140,
          categorySlug: 'pedagio',
          sourceModule: 'tolls',
        }),
        makeRow({
          id: 'other',
          amount: 40,
          categorySlug: 'outros',
          sourceModule: 'manual',
        }),
        makeRow({
          id: 'cancelled',
          amount: 999,
          entryStatus: 'cancelled',
          categorySlug: 'combustivel',
        }),
      ],
      {revenue: 5200},
    );

    expect(breakdown.revenue).toBe(5200);
    expect(breakdown.totalCost).toBe(1570);
    expect(breakdown.profit).toBe(3630);
    expect(breakdown.margin).toBeCloseTo((3630 / 5200) * 100, 5);

    const fuel = breakdown.categories.find((c) => c.category === 'combustivel');
    expect(fuel?.total).toBe(980);
    expect(fuel?.percentOfCost).toBeCloseTo((980 / 1570) * 100, 5);
    expect(fuel?.icon).toBe('⛽');

    const multas = breakdown.categories.find((c) => c.category === 'multas');
    expect(multas?.total).toBe(0);
    expect(multas?.entries).toEqual([]);
  });

  it('keeps entries ready for category expansion without a second query', () => {
    const breakdown = buildTripFinancialBreakdown('trip-1', [
      makeRow({
        id: 'fuel-a',
        amount: 500,
        categorySlug: 'combustivel',
        entryDate: '2026-07-21',
        sourceModule: 'fuel',
        sourceId: 'fuel-a',
        fuelRecordId: 'fuel-a',
      }),
      makeRow({
        id: 'fuel-b',
        amount: 480,
        categorySlug: 'combustivel',
        entryDate: '2026-07-22',
        sourceModule: 'fuel',
        sourceId: 'fuel-b',
        fuelRecordId: 'fuel-b',
      }),
    ], {revenue: 0});

    const entries = getTripFinancialCategoryEntries(breakdown, 'combustivel');
    expect(entries).toHaveLength(2);
    expect(entries[0]?.id).toBe('fuel-a');
    expect(entries[1]?.id).toBe('fuel-b');
    expect(entries.every((entry) => entry.originHref)).toBe(true);
  });

  it('marks mileage-allocated entries with share metadata', () => {
    const breakdown = buildTripFinancialBreakdown(
      'trip-1',
      [
        makeRow({
          id: 'shared-fuel',
          amount: 400,
          categorySlug: 'combustivel',
          sourceModule: 'fuel',
          allocation: 'mileage',
          allocationShare: 0.2,
          originalAmount: 2000,
        }),
      ],
      {revenue: 1000},
    );

    const entry = getTripFinancialCategoryEntries(breakdown, 'combustivel')[0];
    expect(entry?.amount).toBe(400);
    expect(entry?.allocation).toBe('mileage');
    expect(entry?.allocationShare).toBe(0.2);
    expect(entry?.originalAmount).toBe(2000);
    expect(breakdown.totalCost).toBe(400);
    expect(breakdown.profit).toBe(600);
  });

  it('returns null margin when revenue is zero', () => {
    const breakdown = buildTripFinancialBreakdown(
      'trip-1',
      [makeRow({amount: 100, categorySlug: 'outros'})],
      {revenue: 0},
    );
    expect(breakdown.revenue).toBe(0);
    expect(breakdown.profit).toBe(-100);
    expect(breakdown.margin).toBeNull();
  });
});

describe('resolveTripFinancialOriginHref / label — Abrir origem', () => {
  it('routes fuel, maintenance and tires to operational cadastros', () => {
    expect(
      resolveTripFinancialOriginHref({
        id: 'e1',
        sourceModule: 'fuel',
        sourceId: 'fuel-1',
        fuelRecordId: 'fuel-1',
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe(ROUTES.abastecimentoDetail('fuel-1'));

    expect(
      resolveTripFinancialOriginHref({
        id: 'e2',
        sourceModule: 'maintenance',
        sourceId: 'maint-1',
        fuelRecordId: null,
        maintenanceRecordId: 'maint-1',
        tireId: null,
      }),
    ).toBe(ROUTES.manutencaoDetail('maint-1'));

    expect(
      resolveTripFinancialOriginHref({
        id: 'e3',
        sourceModule: 'tires',
        sourceId: 'tire-1',
        fuelRecordId: null,
        maintenanceRecordId: null,
        tireId: 'tire-1',
      }),
    ).toBe(ROUTES.pneuDetail('tire-1'));
  });

  it('routes manual accounts to the financial entry detail', () => {
    expect(
      resolveTripFinancialOriginHref({
        id: 'manual-1',
        sourceModule: 'manual',
        sourceId: null,
        fuelRecordId: null,
        maintenanceRecordId: null,
        tireId: null,
      }),
    ).toBe(ROUTES.financeiroDetail('manual-1'));
  });

  it('exposes contextual button labels', () => {
    expect(resolveTripFinancialOriginLabel('fuel')).toBe('Abrir abastecimento');
    expect(resolveTripFinancialOriginLabel('maintenance')).toBe(
      'Abrir manutenção',
    );
    expect(resolveTripFinancialOriginLabel('tires')).toBe('Abrir compra');
    expect(resolveTripFinancialOriginLabel('manual')).toBe('Abrir conta manual');
    expect(resolveTripFinancialOriginLabel(null)).toBe('Abrir origem');
  });
});

describe('lazy loading contract', () => {
  it('does not invent entries when the source list is empty', () => {
    const breakdown = buildTripFinancialBreakdown('trip-empty', [], {revenue: 0});
    expect(breakdown.categories.every((c) => c.entries.length === 0)).toBe(true);
    expect(breakdown.totalCost).toBe(0);
    expect(breakdown.revenue).toBe(0);
  });
});
