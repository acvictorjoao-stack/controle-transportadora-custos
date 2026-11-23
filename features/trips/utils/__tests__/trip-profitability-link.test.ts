import {describe, expect, it} from 'vitest';

import {buildAllocatedTripViewHref} from '../trip-profitability-link';

const VEHICLE = 'dae10377-a284-4ad1-b706-520b3b432940';

describe('Fase 2.2.4 — link da viagem para a rentabilidade com rateio', () => {
  it('abre o mês da conclusão (dia de Brasília) e o veículo', () => {
    // 21/10 às 23h30 em Brasília = 22/10 02h30 UTC: o mês é outubro.
    expect(
      buildAllocatedTripViewHref({tripStatus: 'completed', completedAt: '2026-10-22T02:30:00Z', vehicleId: VEHICLE}),
    ).toBe(`/dashboard/rentabilidade/viagens?de=2026-10-01&ate=2026-10-31&veiculo=${VEHICLE}`);
  });

  it('31/10 às 23h em Brasília continua em outubro (não vira novembro pelo UTC)', () => {
    expect(
      buildAllocatedTripViewHref({tripStatus: 'completed', completedAt: '2026-11-01T02:00:00Z', vehicleId: VEHICLE}),
    ).toContain('de=2026-10-01&ate=2026-10-31');
  });

  it('fevereiro e ano bissexto', () => {
    expect(
      buildAllocatedTripViewHref({tripStatus: 'completed', completedAt: '2028-02-10T12:00:00Z', vehicleId: VEHICLE}),
    ).toContain('de=2028-02-01&ate=2028-02-29');
  });

  it.each([
    [{tripStatus: 'in_progress', completedAt: null, vehicleId: VEHICLE}],
    [{tripStatus: 'completed', completedAt: null, vehicleId: VEHICLE}],
    [{tripStatus: 'completed', completedAt: '2026-10-21T12:00:00Z', vehicleId: null}],
  ])('sem conclusão ou sem veículo, não há link: %o', (trip) => {
    expect(buildAllocatedTripViewHref(trip)).toBeNull();
  });
});
