import {beforeEach, describe, expect, it, vi} from 'vitest';

import type {FuelRecord} from '@/features/fuel/types';
import type {MaintenanceRecord} from '@/features/maintenance/types';

import {onFuelRecordCreated, onMaintenanceRecordCreated} from '../integration-events';
import {upsertFinancialEntryFromOperation} from '../operation-financial.service';

vi.mock('../operation-financial.service', () => ({
  upsertFinancialEntryFromOperation: vi.fn(async () => {}),
  resolveOperationPaymentType: (value: string | null | undefined) => value ?? 'cash',
  deleteFinancialEntriesFromOperation: vi.fn(async () => {}),
}));

const upsertMock = vi.mocked(upsertFinancialEntryFromOperation);

function fuel(fueledAt: string): FuelRecord {
  return {
    id: 'fuel-1',
    paymentType: 'cash',
    totalAmount: 500,
    fueledAt,
    paymentDueDate: null,
    installmentCount: 1,
    installmentIntervalDays: 30,
    stationName: 'Posto',
    vehiclePlate: 'ABC1D23',
    supplierId: null,
    branchId: null,
    vehicleId: 'vehicle-1',
    driverId: null,
    tripId: null,
    notes: null,
  } as unknown as FuelRecord;
}

function maintenance(openedAt: string, completedAt: string | null): MaintenanceRecord {
  return {
    id: 'mnt-1',
    maintenanceType: 'corrective',
    finalAmount: 250,
    totalCost: 250,
    estimatedAmount: null,
    paymentType: 'cash',
    openedAt,
    completedAt,
    paymentDueDate: null,
    installmentCount: 1,
    installmentIntervalDays: 30,
    description: 'Troca de óleo',
    vehiclePlate: 'ABC1D23',
    supplierId: null,
    supplier: null,
    branchId: null,
    vehicleId: 'vehicle-1',
    notes: null,
  } as unknown as MaintenanceRecord;
}

function sentEntryDate(): string {
  return (upsertMock.mock.calls.at(-1)?.[2] as {entryDate: string}).entryDate;
}

describe('data do lançamento no dia de Brasília', () => {
  beforeEach(() => {
    upsertMock.mockClear();
  });

  it('abastecimento às 23h30 de Brasília (02h30 UTC do dia seguinte) fica no dia de Brasília', async () => {
    await onFuelRecordCreated({} as never, 'company-1', fuel('2026-11-06T02:30:00+00:00'), 'profile-1');
    expect(sentEntryDate()).toBe('2026-11-05');
  });

  it('abastecimento à tarde não muda de dia', async () => {
    await onFuelRecordCreated({} as never, 'company-1', fuel('2026-11-05T18:00:00+00:00'), 'profile-1');
    expect(sentEntryDate()).toBe('2026-11-05');
  });

  it('manutenção concluída às 22h de Brasília fica no dia de Brasília', async () => {
    await onMaintenanceRecordCreated(
      {} as never,
      'company-1',
      maintenance('2026-11-05T12:00:00+00:00', '2026-11-06T01:00:00+00:00'),
      'profile-1',
    );
    expect(sentEntryDate()).toBe('2026-11-05');
  });

  it('manutenção sem conclusão usa a abertura, no dia de Brasília', async () => {
    await onMaintenanceRecordCreated(
      {} as never,
      'company-1',
      maintenance('2026-11-06T02:59:00+00:00', null),
      'profile-1',
    );
    expect(sentEntryDate()).toBe('2026-11-05');
  });
});
