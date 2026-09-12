import {beforeEach, describe, expect, it, vi} from 'vitest';

import {getTripFreightValue} from '@/features/trips/utils/trip-lifecycle';
import type {Trip} from '@/features/trips/types';

import {createFinancialEntry, getCategoryBySlug} from '../../queries/financial-entries';
import {onTripCompleted} from '../integration-events';

vi.mock('../../queries/financial-entries', () => ({
  createFinancialEntry: vi.fn(async () => ({id: 'entry-1'})),
  getCategoryBySlug: vi.fn(async () => ({id: 'cat-receitas'})),
}));

const createFinancialEntryMock = vi.mocked(createFinancialEntry);
const getCategoryBySlugMock = vi.mocked(getCategoryBySlug);

function makeTrip(
  overrides: Partial<
    Pick<
      Trip,
      | 'id'
      | 'tripNumber'
      | 'actualFreightValue'
      | 'contractedFreightValue'
      | 'metadata'
      | 'arrivedAt'
      | 'branchId'
      | 'vehicleId'
      | 'driverId'
      | 'customerId'
      | 'customerContractId'
    >
  > = {},
): Trip {
  return {
    id: 'trip-1',
    companyId: 'company-1',
    branchId: null,
    branchName: null,
    tripNumber: 'T-001',
    tripStatus: 'completed',
    driverId: null,
    driverName: null,
    vehicleId: null,
    vehiclePlate: null,
    vehicleFleetNumber: null,
    clientName: null,
    contractReference: null,
    customerId: null,
    customerContractId: null,
    customerName: null,
    freightTable: null,
    contractedFreightValue: null,
    actualFreightValue: null,
    freightMargin: null,
    origin: null,
    destination: null,
    route: null,
    routeId: null,
    routeName: null,
    routeCode: null,
    plannedDistanceKm: null,
    plannedDepartureAt: null,
    leadTimeMinutes: null,
    unloadTimeMinutes: null,
    plannedArrivalAt: null,
    plannedCompletionAt: null,
    initialOdometerKm: null,
    finalOdometerKm: null,
    initialHourMeter: null,
    finalHourMeter: null,
    departedAt: null,
    arrivedAt: '2026-07-15T12:00:00.000Z',
    startedAt: null,
    completedAt: '2026-07-15T12:00:00.000Z',
    cancelledAt: null,
    cancellationNotes: null,
    weightKg: null,
    volumeM3: null,
    cargoType: null,
    notes: null,
    responsible: null,
    metadata: {},
    status: 'active',
    externalId: null,
    integrationSource: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-15T12:00:00.000Z',
    deletedAt: null,
    createdBy: null,
    updatedBy: null,
    ...overrides,
  } as Trip;
}

function createSupabaseMock(existingEntries: Array<{entry_type: string; amount: number}>) {
  const updatePayloads: unknown[] = [];

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'financial_entries') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(async () => ({
                  data: existingEntries,
                  error: null,
                })),
              })),
            })),
          })),
        };
      }

      if (table === 'trips') {
        return {
          update: vi.fn((payload: unknown) => {
            updatePayloads.push(payload);
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(async () => ({data: null, error: null})),
              })),
            };
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {supabase, updatePayloads};
}

describe('onTripCompleted — Audit #8 freight preference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCategoryBySlugMock.mockResolvedValue({id: 'cat-receitas'} as never);
  });

  it('actual e contracted diferentes → usa actual (alinhado a getTripFreightValue)', async () => {
    const trip = makeTrip({
      actualFreightValue: 1200,
      contractedFreightValue: 1000,
    });
    const {supabase} = createSupabaseMock([]);

    await onTripCompleted(supabase as never, 'company-1', trip, 'profile-1');

    expect(getTripFreightValue(trip)).toBe(1200);
    expect(createFinancialEntryMock).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining({amount: 1200}),
      'profile-1',
      expect.anything(),
    );
  });

  it('somente contracted → usa contracted', async () => {
    const trip = makeTrip({
      actualFreightValue: null,
      contractedFreightValue: 800,
    });
    const {supabase} = createSupabaseMock([]);

    await onTripCompleted(supabase as never, 'company-1', trip, 'profile-1');

    expect(getTripFreightValue(trip)).toBe(800);
    expect(createFinancialEntryMock).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining({amount: 800}),
      'profile-1',
      expect.anything(),
    );
  });

  it('somente actual → usa actual', async () => {
    const trip = makeTrip({
      actualFreightValue: 950,
      contractedFreightValue: null,
    });
    const {supabase} = createSupabaseMock([]);

    await onTripCompleted(supabase as never, 'company-1', trip, 'profile-1');

    expect(getTripFreightValue(trip)).toBe(950);
    expect(createFinancialEntryMock).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining({amount: 950}),
      'profile-1',
      expect.anything(),
    );
  });

  it('nenhum dos dois → preserva fallback metadata.freight_value', async () => {
    const trip = makeTrip({
      actualFreightValue: null,
      contractedFreightValue: null,
      metadata: {freight_value: 500},
    });
    const {supabase} = createSupabaseMock([]);

    await onTripCompleted(supabase as never, 'company-1', trip, 'profile-1');

    expect(getTripFreightValue(trip)).toBe(0);
    expect(createFinancialEntryMock).toHaveBeenCalledWith(
      expect.anything(),
      'company-1',
      expect.objectContaining({amount: 500}),
      'profile-1',
      expect.anything(),
    );
  });

  it('totalRevenue > 0 → não cria lançamento e usa receita já existente', async () => {
    const trip = makeTrip({
      actualFreightValue: 1200,
      contractedFreightValue: 1000,
    });
    const {supabase, updatePayloads} = createSupabaseMock([
      {entry_type: 'revenue', amount: 777},
    ]);

    await onTripCompleted(supabase as never, 'company-1', trip, 'profile-1');

    expect(createFinancialEntryMock).not.toHaveBeenCalled();
    expect(updatePayloads[0]).toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({
          profitability: expect.objectContaining({revenue: 777}),
        }),
      }),
    );
  });

  it('confirma alinhamento com getTripFreightValue em todos os pares trip', async () => {
    const cases: Array<Pick<Trip, 'actualFreightValue' | 'contractedFreightValue'>> = [
      {actualFreightValue: 1500, contractedFreightValue: 900},
      {actualFreightValue: null, contractedFreightValue: 600},
      {actualFreightValue: 400, contractedFreightValue: null},
    ];

    for (const freight of cases) {
      vi.clearAllMocks();
      const trip = makeTrip(freight);
      const {supabase} = createSupabaseMock([]);
      const expected = getTripFreightValue(trip);

      await onTripCompleted(supabase as never, 'company-1', trip, 'profile-1');

      expect(createFinancialEntryMock).toHaveBeenCalledWith(
        expect.anything(),
        'company-1',
        expect.objectContaining({amount: expected}),
        'profile-1',
        expect.anything(),
      );
    }
  });
});
