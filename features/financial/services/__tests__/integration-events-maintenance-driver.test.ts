import {describe, expect, it, vi} from 'vitest';

import type {MaintenanceRecord} from '@/features/maintenance/types';

import {onMaintenanceRecordCreated} from '../integration-events';
import {upsertFinancialEntryFromOperation} from '../operation-financial.service';

vi.mock('../operation-financial.service', () => ({
  upsertFinancialEntryFromOperation: vi.fn(async () => {}),
  resolveOperationPaymentType: (value: string | null | undefined) => value ?? 'cash',
  deleteFinancialEntriesFromOperation: vi.fn(async () => {}),
}));

const upsertMock = vi.mocked(upsertFinancialEntryFromOperation);

describe('Audit #20 — RC 27.1 preservado no financeiro', () => {
  it('lançamento de manutenção continua sem motorista mesmo com driver_id no registro', async () => {
    const record = {
      id: 'rec-1',
      maintenanceType: 'corrective',
      driverId: 'aaaaaaaa-0000-0000-0000-000000000001',
      vehicleId: 'vehicle-1',
      branchId: 'branch-1',
      finalAmount: 250,
      totalCost: 250,
      estimatedAmount: 100,
      paymentType: 'cash',
      openedAt: '2026-03-01T10:00:00.000Z',
      completedAt: '2026-03-02T10:00:00.000Z',
      paymentDueDate: null,
      installmentCount: 1,
      installmentIntervalDays: 30,
      description: 'Troca de óleo',
      vehiclePlate: 'ABC1D23',
      supplierId: 'supplier-1',
      supplier: 'Oficina',
      externalId: null,
      notes: null,
    } as unknown as MaintenanceRecord;

    await onMaintenanceRecordCreated({} as never, 'company-1', record, 'profile-1');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock.mock.calls[0][2]).toMatchObject({
      sourceModule: 'maintenance',
      amount: 250,
      vehicleId: 'vehicle-1',
      driverId: null,
      tripId: null,
    });
  });
});
