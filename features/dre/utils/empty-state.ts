import type {
  OperationalDreByCustomerData,
  OperationalDreByRouteData,
  OperationalDreByVehicleData,
  OperationalDreData,
  OperationalDreFilterOptions,
} from '../types';

export const EMPTY_OPERATIONAL_DRE: OperationalDreData = {
  revenues: {freightRevenue: 0, totalRevenue: 0},
  costs: {
    fuel: 0,
    maintenance: 0,
    tires: 0,
    financial: 0,
    accountsPayable: 0,
    other: 0,
    totalOperatingCosts: 0,
  },
  result: {operatingProfit: 0, operatingMarginPercent: null},
  indicators: {
    revenuePerKm: null,
    costPerKm: null,
    profitPerKm: null,
    revenuePerTrip: null,
    costPerTrip: null,
    profitPerTrip: null,
    tripCount: 0,
    totalKm: 0,
    customersServed: 0,
    routesUsed: 0,
    vehiclesUsed: 0,
  },
  analyticalTable: [],
  costCenterBreakdown: {byCode: {}, ranking: [], total: 0},
  filters: {},
};

export const EMPTY_OPERATIONAL_DRE_BY_ROUTE: OperationalDreByRouteData = {
  groups: [],
  filters: {},
};

export const EMPTY_OPERATIONAL_DRE_BY_CUSTOMER: OperationalDreByCustomerData = {
  groups: [],
  filters: {},
};

export const EMPTY_OPERATIONAL_DRE_BY_VEHICLE: OperationalDreByVehicleData = {
  groups: [],
  filters: {},
};

export const EMPTY_OPERATIONAL_DRE_FILTER_OPTIONS: OperationalDreFilterOptions = {
  branches: [],
  customers: [],
  routes: [],
  vehicles: [],
  drivers: [],
  costCenters: [],
};
