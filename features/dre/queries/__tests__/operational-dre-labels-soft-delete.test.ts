import type {SupabaseClient} from '@supabase/supabase-js';
import {describe, expect, it, vi} from 'vitest';

import {
  calculateOperationalDreByDriver,
  calculateOperationalDreByRoute,
  calculateOperationalDreByVehicle,
} from '../../services/operational-dre-by-dimension';
import type {OperationalDreTripRow} from '../../types';
import {
  fetchOperationalDreDriverLabels,
  fetchOperationalDreRouteLabels,
  fetchOperationalDreVehicleLabels,
} from '../operational-dre-data';

const COMPANY_ID = 'company-audit-16';

type LabelTable = 'routes' | 'vehicles' | 'drivers';

function createLabelQueryStub(
  table: LabelTable,
  rows: Record<string, unknown>[],
) {
  const filters: {
    companyId?: string;
    ids?: string[];
    deletedAtNull?: boolean;
  } = {};

  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      if (column === 'company_id') filters.companyId = value as string;
      return query;
    }),
    is: vi.fn((column: string, value: unknown) => {
      if (column === 'deleted_at' && value === null) {
        filters.deletedAtNull = true;
      }
      return query;
    }),
    in: vi.fn((column: string, value: string[]) => {
      if (column === 'id') filters.ids = value;
      return query;
    }),
    then: (
      resolve: (value: {data: Record<string, unknown>[]; error: null}) => void,
    ) => {
      let data = rows;
      if (filters.companyId) {
        data = data.filter((row) => row.company_id === filters.companyId);
      }
      if (filters.deletedAtNull) {
        data = data.filter((row) => row.deleted_at == null);
      }
      if (filters.ids?.length) {
        data = data.filter((row) => filters.ids!.includes(String(row.id)));
      }
      return Promise.resolve({data, error: null}).then(resolve);
    },
  };

  return {
    table,
    query,
    client: {
      from: vi.fn((name: string) => {
        if (name !== table) {
          throw new Error(`unexpected table: ${name}`);
        }
        return {
          select: vi.fn(() => query),
        };
      }),
    } as unknown as SupabaseClient,
  };
}

describe('Audit #16 — DRE entity labels respect soft-delete', () => {
  it('fetchOperationalDreRouteLabels returns active route labels', async () => {
    const {client, query} = createLabelQueryStub('routes', [
      {
        id: 'route-active',
        company_id: COMPANY_ID,
        deleted_at: null,
        name: 'Rota A',
        origin: 'São Luís',
        destination: 'Imperatriz',
      },
      {
        id: 'route-deleted',
        company_id: COMPANY_ID,
        deleted_at: '2026-01-01T00:00:00.000Z',
        name: 'Rota excluída',
        origin: 'X',
        destination: 'Y',
      },
    ]);

    const labels = await fetchOperationalDreRouteLabels(client, COMPANY_ID, [
      'route-active',
      'route-deleted',
    ]);

    expect(query.eq).toHaveBeenCalledWith('company_id', COMPANY_ID);
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(labels.get('route-active')).toBe('Rota A');
    expect(labels.has('route-deleted')).toBe(false);
  });

  it('fetchOperationalDreVehicleLabels returns active vehicle labels', async () => {
    const {client, query} = createLabelQueryStub('vehicles', [
      {
        id: 'veh-active',
        company_id: COMPANY_ID,
        deleted_at: null,
        plate: 'abc1d23',
      },
      {
        id: 'veh-deleted',
        company_id: COMPANY_ID,
        deleted_at: '2026-02-01T00:00:00.000Z',
        plate: 'zzz9999',
      },
    ]);

    const labels = await fetchOperationalDreVehicleLabels(client, COMPANY_ID, [
      'veh-active',
      'veh-deleted',
    ]);

    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(labels.get('veh-active')).toBe('ABC-1D23');
    expect(labels.has('veh-deleted')).toBe(false);
  });

  it('fetchOperationalDreDriverLabels returns active driver labels', async () => {
    const {client, query} = createLabelQueryStub('drivers', [
      {
        id: 'drv-active',
        company_id: COMPANY_ID,
        deleted_at: null,
        name: 'João Ativo',
      },
      {
        id: 'drv-deleted',
        company_id: COMPANY_ID,
        deleted_at: '2026-03-01T00:00:00.000Z',
        name: 'João Excluído',
      },
    ]);

    const labels = await fetchOperationalDreDriverLabels(client, COMPANY_ID, [
      'drv-active',
      'drv-deleted',
    ]);

    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(labels.get('drv-active')).toBe('João Ativo');
    expect(labels.has('drv-deleted')).toBe(false);
  });

  it('applies company_id and tolerates unknown ids without error', async () => {
    const {client, query} = createLabelQueryStub('routes', [
      {
        id: 'route-other-company',
        company_id: 'other-company',
        deleted_at: null,
        name: 'Outra',
        origin: 'A',
        destination: 'B',
      },
    ]);

    const labels = await fetchOperationalDreRouteLabels(client, COMPANY_ID, [
      'missing-id',
      '',
    ]);

    expect(query.eq).toHaveBeenCalledWith('company_id', COMPANY_ID);
    expect(labels.size).toBe(0);
  });

  it('does not remove financial grouping when route label is absent (soft-deleted)', () => {
    const trips: OperationalDreTripRow[] = [
      {
        id: 't1',
        branchId: null,
        customerId: null,
        routeId: 'route-deleted',
        vehicleId: null,
        driverId: null,
        contractedFreightValue: 1000,
        actualFreightValue: 800,
        distanceKm: 50,
      },
    ];

    const groups = calculateOperationalDreByRoute(trips, [], {}, new Map());
    expect(groups).toHaveLength(1);
    expect(groups[0]?.dimensionKey).toBe('route-deleted');
    expect(groups[0]?.label).toBe('Sem rota');
    expect(groups[0]?.totalRevenue).toBe(800);
    expect(groups[0]?.tripCount).toBe(1);
  });

  it('does not remove financial grouping when vehicle or driver label is absent', () => {
    const trip: OperationalDreTripRow = {
      id: 't1',
      branchId: null,
      customerId: null,
      routeId: null,
      vehicleId: 'veh-deleted',
      driverId: 'drv-deleted',
      contractedFreightValue: 500,
      actualFreightValue: 600,
      distanceKm: 20,
    };

    const byVehicle = calculateOperationalDreByVehicle([trip], [], {}, new Map());
    expect(byVehicle[0]?.totalRevenue).toBe(600);
    expect(byVehicle[0]?.label).toBe('Sem veículo');

    const byDriver = calculateOperationalDreByDriver([trip], [], {}, new Map());
    expect(byDriver[0]?.totalRevenue).toBe(600);
    expect(byDriver[0]?.label).toBe('Sem motorista');
  });
});
