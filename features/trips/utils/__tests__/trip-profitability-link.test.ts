import {describe, expect, it} from 'vitest';

import {buildAllocatedTripViewHref} from '../trip-profitability-link';

const VEHICLE = 'dae10377-a284-4ad1-b706-520b3b432940';

describe('Fase 2.2.4 — link da viagem para a rentabilidade com rateio', () => {
  it('viagem concluída com veículo: dia da conclusão em Brasília e o veículo', () => {
    // 21/10 às 23h30 em Brasília = 22/10 02h30 UTC: o dia é 21/10.
    expect(
      buildAllocatedTripViewHref({tripStatus: 'completed', completedAt: '2026-10-22T02:30:00Z', vehicleId: VEHICLE}),
    ).toBe(`/dashboard/rentabilidade/viagens?de=2026-10-21&ate=2026-10-21&veiculo=${VEHICLE}`);
  });

  it.each([
    [{tripStatus: 'in_progress', completedAt: null, vehicleId: VEHICLE}],
    [{tripStatus: 'completed', completedAt: null, vehicleId: VEHICLE}],
    [{tripStatus: 'completed', completedAt: '2026-10-21T12:00:00Z', vehicleId: null}],
  ])('sem conclusão ou sem veículo, não há link: %o', (trip) => {
    expect(buildAllocatedTripViewHref(trip)).toBeNull();
  });
});
