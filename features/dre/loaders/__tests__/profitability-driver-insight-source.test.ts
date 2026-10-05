import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {SupabaseClient} from '@supabase/supabase-js';

import type {OperationalDreDriverGroup} from '@/features/dre/types';
import {EMPTY_OPERATIONAL_DRE} from '@/features/dre/utils/empty-state';

import {getCustomerProfitabilityDashboardData} from '../customer-profitability-dashboard-loader';
import {getDriverProfitabilityDashboardData} from '../driver-profitability-dashboard-loader';
import {getRouteProfitabilityDashboardData} from '../route-profitability-dashboard-loader';
import {getVehicleProfitabilityDashboardData} from '../vehicle-profitability-dashboard-loader';

const getOperationalDreBundle = vi.hoisted(() => vi.fn());
const emptyGroups = vi.hoisted(() =>
  vi.fn(async (_s: unknown, _c: unknown, filters: unknown) => ({
    groups: [],
    filters,
  })),
);
const getOperationalDRE = vi.hoisted(() => vi.fn());

vi.mock('@/features/dre/loaders', () => ({
  getOperationalDreBundle,
  getOperationalDreByCustomer: emptyGroups,
  getOperationalDreByDriver: emptyGroups,
  getOperationalDreByRoute: emptyGroups,
  getOperationalDreByVehicle: emptyGroups,
  getOperationalDRE,
  getOperationalDreFilterOptions: vi.fn(async () => null),
}));

const supabase = {} as SupabaseClient;

const driverGroups: OperationalDreDriverGroup[] = [
  {
    dimensionKey: 'drv-1',
    dimensionType: 'driver',
    label: 'Motorista 1',
    tripCount: 2,
    totalRevenue: 5000,
    totalCost: 1000,
    totalProfit: 4000,
    marginPercent: 80,
    totalKm: 200,
    costPerKm: 5,
    revenuePerKm: 25,
    trips: [],
    driver: {id: 'drv-1', label: 'Motorista 1'},
  },
];

const filters = {
  branchId: 'b1',
  customerId: 'c1',
  dateFrom: '2026-03-01',
  dateTo: '2026-03-31',
};

describe('Audit #28 — fonte do insight de motorista nos dashboards de rentabilidade', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOperationalDreBundle.mockResolvedValue({
      dre: EMPTY_OPERATIONAL_DRE,
      byRoute: {groups: [], filters},
      byCustomer: [],
      byVehicle: [],
      byDriver: driverGroups,
    });
    getOperationalDRE.mockResolvedValue(EMPTY_OPERATIONAL_DRE);
  });

  it.each([
    ['clientes', getCustomerProfitabilityDashboardData],
    ['rotas', getRouteProfitabilityDashboardData],
    ['veículos', getVehicleProfitabilityDashboardData],
  ] as const)(
    '%s: reutiliza bundle.byDriver do mesmo período/filtros (sem consulta paralela)',
    async (_name, load) => {
      const data = await load(supabase, 'company-1', filters);

      expect(getOperationalDreBundle).toHaveBeenCalledTimes(1);
      expect(getOperationalDreBundle).toHaveBeenCalledWith(
        supabase,
        'company-1',
        expect.objectContaining(filters),
      );
      expect(data.byDriverGroups).toBe(driverGroups);
      expect(data.period).toEqual(expect.objectContaining(filters));
    },
  );

  it('motoristas: insight usa os mesmos grupos do ranking (bundle.byDriver)', async () => {
    const data = await getDriverProfitabilityDashboardData(
      supabase,
      'company-1',
      filters,
    );

    expect(getOperationalDreBundle).toHaveBeenCalledTimes(1);
    expect(getOperationalDreBundle).toHaveBeenCalledWith(
      supabase,
      'company-1',
      expect.objectContaining(filters),
    );
    expect(data.byDriver.groups).toBe(driverGroups);
    expect(data.rankingRows[0]?.id).toBe('drv-1');
  });

  it('sem período explícito: grupos de motorista vêm do mesmo período padrão do dashboard', async () => {
    const data = await getCustomerProfitabilityDashboardData(
      supabase,
      'company-1',
      {branchId: 'b1'},
    );

    expect(data.period.dateFrom).toBeTruthy();
    expect(data.period.dateTo).toBeTruthy();
    expect(getOperationalDreBundle).toHaveBeenCalledWith(
      supabase,
      'company-1',
      data.period,
    );
    expect(data.byDriverGroups).toBe(driverGroups);
  });
});
