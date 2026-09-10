import {describe, expect, it} from 'vitest';

import {
  expenseMatchesCompetenceScope,
  expenseMatchesDimensionalScope,
  hasOperationalDreDimensionalFilters,
  orphanExpenseEntryDateParts,
  resolveOperationalDreExpenseDimensionFilter,
} from '../../services/operational-dre-expense-scope';
import type {OperationalDreExpenseRow} from '../../types';

function expense(
  overrides: Partial<
    Pick<
      OperationalDreExpenseRow,
      'id' | 'tripId' | 'vehicleId' | 'driverId' | 'customerId'
    >
  > = {},
) {
  return {
    tripId: null as string | null,
    vehicleId: null as string | null,
    driverId: null as string | null,
    customerId: null as string | null,
    ...overrides,
  };
}

describe('operational-dre-expense-scope (AND dimensional)', () => {
  describe('A) nenhum filtro dimensional', () => {
    it('OR separa vinculados (T) de órfãos; aceita payroll/global no braço órfão', () => {
      expect(hasOperationalDreDimensionalFilters({branchId: 'b1'})).toBe(false);
      expect(
        resolveOperationalDreExpenseDimensionFilter({branchId: 'b1'}, ['t1']),
      ).toEqual({
        shouldReturnEmpty: false,
        orFilter: 'trip_id.in.(t1),trip_id.is.null',
      });

      const payroll = expense({id: 'payroll'});
      expect(
        expenseMatchesDimensionalScope(payroll, {branchId: 'b1'}, new Set()),
      ).toBe(true);
      expect(
        expenseMatchesCompetenceScope(payroll, {branchId: 'b1'}, new Set()),
      ).toBe(true);
    });
  });

  describe('B) somente motorista', () => {
    const filters = {driverId: 'A'};
    const T = new Set(['t-A']);

    it('trip do motorista entra; trip de outro sai', () => {
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-A'}), filters, T),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-B'}), filters, T),
      ).toBe(false);
    });

    it('expense direta driver=A entra; B sai; payroll sai', () => {
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'A'}),
          filters,
          T,
        ),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'B'}),
          filters,
          T,
        ),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(expense({}), filters, T),
      ).toBe(false);
    });

    it('PostgREST: trip IN T OR (null trip AND driver)', () => {
      expect(
        resolveOperationalDreExpenseDimensionFilter(filters, ['t-A']),
      ).toEqual({
        shouldReturnEmpty: false,
        orFilter: 'trip_id.in.(t-A),and(trip_id.is.null,driver_id.eq.A)',
      });
    });
  });

  describe('C) somente veículo', () => {
    const filters = {vehicleId: 'V'};
    const T = new Set(['t-V']);

    it('trip do veículo entra; vehicle=V sem trip entra; OUTRO sai', () => {
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-V'}), filters, T),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({vehicleId: 'V'}),
          filters,
          T,
        ),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({vehicleId: 'OUTRO'}),
          filters,
          T,
        ),
      ).toBe(false);
    });
  });

  describe('D) somente cliente', () => {
    const filters = {customerId: 'C'};
    const T = new Set(['t-C']);

    it('trip do cliente entra; customer=C sem trip entra; outro sai', () => {
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-C'}), filters, T),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({customerId: 'C'}),
          filters,
          T,
        ),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({customerId: 'X'}),
          filters,
          T,
        ),
      ).toBe(false);
    });
  });

  describe('E) somente rota', () => {
    const filters = {routeId: 'R'};
    const T = new Set(['t-R']);

    it('trip da rota entra; sem trip fica fora (vehicle/driver/customer não escapam)', () => {
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-R'}), filters, T),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({vehicleId: 'V', driverId: 'A', customerId: 'C'}),
          filters,
          T,
        ),
      ).toBe(false);
    });

    it('sem trips → vazio; com trips → só trip_id.in', () => {
      expect(
        resolveOperationalDreExpenseDimensionFilter(filters, []),
      ).toEqual({shouldReturnEmpty: true, orFilter: null});
      expect(
        resolveOperationalDreExpenseDimensionFilter(filters, ['t-R']),
      ).toEqual({
        shouldReturnEmpty: false,
        orFilter: 'trip_id.in.(t-R)',
      });
    });
  });

  describe('F) motorista + veículo', () => {
    const filters = {driverId: 'A', vehicleId: 'V'};
    const T = new Set(['t-AV']);

    it('somente trip A+V entra; diretos parciais saem; A+V direto entra', () => {
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-AV'}), filters, T),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-A-only'}), filters, T),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'A'}),
          filters,
          T,
        ),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(
          expense({vehicleId: 'V'}),
          filters,
          T,
        ),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'A', vehicleId: 'OUTRO'}),
          filters,
          T,
        ),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'A', vehicleId: 'V'}),
          filters,
          T,
        ),
      ).toBe(true);
    });

    it('PostgREST usa AND no braço direto (não OR amplo entre dimensões)', () => {
      expect(
        resolveOperationalDreExpenseDimensionFilter(filters, ['t-AV']),
      ).toEqual({
        shouldReturnEmpty: false,
        orFilter:
          'trip_id.in.(t-AV),and(trip_id.is.null,driver_id.eq.A,vehicle_id.eq.V)',
      });
    });
  });

  describe('G) motorista + cliente', () => {
    const filters = {driverId: 'A', customerId: 'C'};
    const T = new Set(['t-AC']);

    it('somente A ou somente C sai; A+C entra', () => {
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'A'}),
          filters,
          T,
        ),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(
          expense({customerId: 'C'}),
          filters,
          T,
        ),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'A', customerId: 'C'}),
          filters,
          T,
        ),
      ).toBe(true);
    });
  });

  describe('H) motorista + rota', () => {
    const filters = {driverId: 'A', routeId: 'R'};
    const T = new Set(['t-AR']);

    it('somente trips A+R; expense sem trip sai', () => {
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-AR'}), filters, T),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({driverId: 'A', vehicleId: 'V'}),
          filters,
          T,
        ),
      ).toBe(false);
      expect(
        resolveOperationalDreExpenseDimensionFilter(filters, ['t-AR']),
      ).toEqual({
        shouldReturnEmpty: false,
        orFilter: 'trip_id.in.(t-AR)',
      });
    });
  });

  describe('I) combinação completa', () => {
    const filters = {
      driverId: 'A',
      vehicleId: 'V',
      customerId: 'C',
      routeId: 'R',
    };
    const T = new Set(['t-all']);

    it('somente trip que satisfaz todas as dimensões entra', () => {
      expect(
        expenseMatchesDimensionalScope(expense({tripId: 't-all'}), filters, T),
      ).toBe(true);
      expect(
        expenseMatchesDimensionalScope(
          expense({
            driverId: 'A',
            vehicleId: 'V',
            customerId: 'C',
          }),
          filters,
          T,
        ),
      ).toBe(false);
    });
  });

  describe('J) conflito trip válida + driver conflitante na expense', () => {
    it('vínculo determinante é trip ∈ T', () => {
      const filters = {driverId: 'A'};
      const T = new Set(['t-A']);
      expect(
        expenseMatchesDimensionalScope(
          expense({tripId: 't-A', driverId: 'OUTRO'}),
          filters,
          T,
        ),
      ).toBe(true);
    });
  });

  describe('K) payroll', () => {
    it('fora de qualquer F ≠ vazio', () => {
      const payroll = expense({});
      expect(
        expenseMatchesDimensionalScope(payroll, {driverId: 'A'}, new Set(['t1'])),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(payroll, {vehicleId: 'V'}, new Set()),
      ).toBe(false);
      expect(
        expenseMatchesDimensionalScope(payroll, {}, new Set()),
      ).toBe(true);
    });
  });

  describe('L) tenant', () => {
    it('company_id não faz parte do filtro dimensional (fica AND na query base)', () => {
      const scope = resolveOperationalDreExpenseDimensionFilter(
        {driverId: 'A'},
        ['t1'],
      );
      expect(JSON.stringify(scope)).not.toMatch(/company/i);
    });
  });

  describe('M) soft delete', () => {
    it('regra de escopo não reintroduz deletados — deleted_at permanece na query base', () => {
      // Contratos da resolução não mencionam deleted_at; exclusão é AND externo.
      const scope = resolveOperationalDreExpenseDimensionFilter(
        {vehicleId: 'V'},
        ['t1'],
      );
      expect(scope.orFilter).not.toMatch(/deleted/);
    });
  });
});

describe('Audit #7 — competência completed_at (T) vs entry_date (órfãos)', () => {
  const period = {dateFrom: '2026-07-01', dateTo: '2026-07-31'};

  it('orphanExpenseEntryDateParts monta gte/lte', () => {
    expect(orphanExpenseEntryDateParts(period)).toEqual([
      'entry_date.gte.2026-07-01',
      'entry_date.lte.2026-07-31',
    ]);
    expect(orphanExpenseEntryDateParts({})).toEqual([]);
  });

  it('sem dimensões: vinculados via T sem entry_date; órfãos com entry_date no OR', () => {
    expect(
      resolveOperationalDreExpenseDimensionFilter(period, ['trip-m1']),
    ).toEqual({
      shouldReturnEmpty: false,
      orFilter:
        'trip_id.in.(trip-m1),and(trip_id.is.null,entry_date.gte.2026-07-01,entry_date.lte.2026-07-31)',
    });
  });

  it('com motorista: entry_date só no braço órfão', () => {
    expect(
      resolveOperationalDreExpenseDimensionFilter(
        {...period, driverId: 'A'},
        ['trip-m1'],
      ),
    ).toEqual({
      shouldReturnEmpty: false,
      orFilter:
        'trip_id.in.(trip-m1),and(trip_id.is.null,driver_id.eq.A,entry_date.gte.2026-07-01,entry_date.lte.2026-07-31)',
    });
  });

  it('rota dimensional: só trip_id.in — sem entry_date (vinculados seguem viagem)', () => {
    expect(
      resolveOperationalDreExpenseDimensionFilter(
        {...period, routeId: 'R'},
        ['trip-m1'],
      ),
    ).toEqual({
      shouldReturnEmpty: false,
      orFilter: 'trip_id.in.(trip-m1)',
    });
  });

  it('virada de mês: custo vinculado a T entra mesmo se entry_date fosse M2 (client-side)', () => {
    const T = new Set(['trip-m1']);
    const linkedLateBooking = expense({tripId: 'trip-m1'});
    expect(expenseMatchesCompetenceScope(linkedLateBooking, period, T)).toBe(
      true,
    );
  });

  it('virada de mês: custo vinculado a viagem fora de T não entra no período', () => {
    const T = new Set(['trip-m1']);
    const linkedOtherMonth = expense({tripId: 'trip-m0'});
    expect(expenseMatchesCompetenceScope(linkedOtherMonth, period, T)).toBe(
      false,
    );
    // Sem competência, dimensional “vazio” aceitaria — Audit #7 fecha o buraco.
    expect(expenseMatchesDimensionalScope(linkedOtherMonth, period, T)).toBe(
      true,
    );
  });

  it('órfão sem trip: competência client-side aceita (entry_date é da query)', () => {
    const orphan = expense({});
    expect(
      expenseMatchesCompetenceScope(orphan, period, new Set(['trip-m1'])),
    ).toBe(true);
  });

  it('sem trips no período: só braço órfão com entry_date', () => {
    expect(resolveOperationalDreExpenseDimensionFilter(period, [])).toEqual({
      shouldReturnEmpty: false,
      orFilter:
        'and(trip_id.is.null,entry_date.gte.2026-07-01,entry_date.lte.2026-07-31)',
    });
  });
});
