import type {OperationalDreDimensionGroup, OperationalDreRouteGroup} from '@/features/dre/types';

import {classifyMarginStatus, type MarginStatus} from './margin-status';

export interface TopRouteRankingItem {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  marginPercent: number | null;
  status: MarginStatus;
}

export interface TopCustomerRankingItem {
  id: string;
  name: string;
  revenue: number;
  profit: number;
  marginPercent: number | null;
  status?: MarginStatus;
}

export interface RouteRankingRow {
  id: string;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  marginPercent: number | null;
  status: MarginStatus;
  totalKm: number;
  revenuePerKm: number | null;
  costPerKm: number | null;
  profitPerKm: number | null;
}

export interface CustomerRankingRow {
  id: string;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  marginPercent: number | null;
  tripCount: number;
  status: MarginStatus;
}

export interface VehicleRankingRow {
  id: string;
  name: string;
  revenue: number;
  costs: number;
  profit: number;
  totalKm: number;
  revenuePerKm: number | null;
  costPerKm: number | null;
  profitPerKm: number | null;
  tripCount: number;
  marginPercent: number | null;
  status: MarginStatus;
}

export interface DriverRankingRow {
  id: string;
  name: string;
  tripCount: number;
  revenue: number;
  costs: number;
  profit: number;
  marginPercent: number | null;
  totalKm: number;
  revenuePerTrip: number | null;
  costPerTrip: number | null;
  profitPerTrip: number | null;
  status: MarginStatus;
}

export interface VehicleHighlightItem {
  id: string;
  name: string;
  value: number;
  secondaryLabel?: string;
  secondaryValue?: string;
}

function sortByProfitDesc<T extends {totalProfit: number; totalRevenue: number}>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    if (b.totalProfit !== a.totalProfit) return b.totalProfit - a.totalProfit;
    return b.totalRevenue - a.totalRevenue;
  });
}

export function buildTopRoutes(
  groups: OperationalDreRouteGroup[],
  limit = 5,
): TopRouteRankingItem[] {
  return sortByProfitDesc(groups)
    .filter((group) => group.route.id != null)
    .slice(0, limit)
    .map((group) => ({
      id: group.route.id!,
      name: group.route.label,
      revenue: group.totalRevenue,
      profit: group.totalProfit,
      marginPercent: group.marginPercent,
      status: classifyMarginStatus(group.marginPercent),
    }));
}

export function buildTopCustomers(
  groups: OperationalDreDimensionGroup[],
  limit = 5,
): TopCustomerRankingItem[] {
  return sortByProfitDesc(groups)
    .filter((group) => group.dimensionKey !== '__none__')
    .slice(0, limit)
    .map((group) => ({
      id: group.dimensionKey,
      name: group.label,
      revenue: group.totalRevenue,
      profit: group.totalProfit,
      marginPercent: group.marginPercent,
      status: classifyMarginStatus(group.marginPercent),
    }));
}

/** Clientes com margem negativa (prejuízo relativo à receita). */
export function buildLossMakingCustomers(
  groups: OperationalDreDimensionGroup[],
): TopCustomerRankingItem[] {
  return sortByProfitDesc(groups)
    .filter(
      (group) =>
        group.dimensionKey !== '__none__' &&
        group.marginPercent != null &&
        group.marginPercent < 0,
    )
    .map((group) => ({
      id: group.dimensionKey,
      name: group.label,
      revenue: group.totalRevenue,
      profit: group.totalProfit,
      marginPercent: group.marginPercent,
      status: classifyMarginStatus(group.marginPercent),
    }));
}

export function buildRouteRankingRows(
  groups: OperationalDreRouteGroup[],
): RouteRankingRow[] {
  return sortByProfitDesc(groups).map((group) => {
    const profitPerKm =
      group.totalKm > 0 ? group.totalProfit / group.totalKm : null;
    return {
      id: group.dimensionKey,
      name: group.label,
      revenue: group.totalRevenue,
      costs: group.totalCost,
      profit: group.totalProfit,
      marginPercent: group.marginPercent,
      status: classifyMarginStatus(group.marginPercent),
      totalKm: group.totalKm,
      revenuePerKm: group.revenuePerKm,
      costPerKm: group.costPerKm,
      profitPerKm,
    };
  });
}

export function buildCustomerRankingRows(
  groups: OperationalDreDimensionGroup[],
): CustomerRankingRow[] {
  return sortByProfitDesc(groups)
    .filter((group) => group.dimensionKey !== '__none__')
    .map((group) => ({
      id: group.dimensionKey,
      name: group.label,
      revenue: group.totalRevenue,
      costs: group.totalCost,
      profit: group.totalProfit,
      marginPercent: group.marginPercent,
      tripCount: group.tripCount,
      status: classifyMarginStatus(group.marginPercent),
    }));
}

export function buildVehicleRankingRows(
  groups: OperationalDreDimensionGroup[],
): VehicleRankingRow[] {
  return sortByProfitDesc(groups)
    .filter((group) => group.dimensionKey !== '__none__')
    .map((group) => {
      const profitPerKm =
        group.totalKm > 0 ? group.totalProfit / group.totalKm : null;
      return {
        id: group.dimensionKey,
        name: group.label,
        revenue: group.totalRevenue,
        costs: group.totalCost,
        profit: group.totalProfit,
        totalKm: group.totalKm,
        revenuePerKm: group.revenuePerKm,
        costPerKm: group.costPerKm,
        profitPerKm,
        tripCount: group.tripCount,
        marginPercent: group.marginPercent,
        status: classifyMarginStatus(group.marginPercent),
      };
    });
}

export function buildDriverRankingRows(
  groups: OperationalDreDimensionGroup[],
): DriverRankingRow[] {
  return sortByProfitDesc(groups)
    .filter((group) => group.dimensionKey !== '__none__')
    .map((group) => {
      const tripCount = group.tripCount;
      return {
        id: group.dimensionKey,
        name: group.label,
        tripCount,
        revenue: group.totalRevenue,
        costs: group.totalCost,
        profit: group.totalProfit,
        marginPercent: group.marginPercent,
        totalKm: group.totalKm,
        revenuePerTrip: tripCount > 0 ? group.totalRevenue / tripCount : null,
        costPerTrip: tripCount > 0 ? group.totalCost / tripCount : null,
        profitPerTrip: tripCount > 0 ? group.totalProfit / tripCount : null,
        status: classifyMarginStatus(group.marginPercent),
      };
    });
}

/** Cards laterais: maior receita, lucro, custo e menor rentabilidade. */
export function buildVehicleHighlights(
  groups: OperationalDreDimensionGroup[],
): {
  highestRevenue: VehicleHighlightItem | null;
  highestProfit: VehicleHighlightItem | null;
  highestCost: VehicleHighlightItem | null;
  lowestProfitability: VehicleHighlightItem | null;
} {
  const assigned = groups.filter((group) => group.dimensionKey !== '__none__');
  if (assigned.length === 0) {
    return {
      highestRevenue: null,
      highestProfit: null,
      highestCost: null,
      lowestProfitability: null,
    };
  }

  const byRevenue = [...assigned].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const byProfit = sortByProfitDesc(assigned);
  const byCost = [...assigned].sort((a, b) => b.totalCost - a.totalCost);
  const byMargin = [...assigned].sort((a, b) => {
    const aMargin = a.marginPercent ?? Number.POSITIVE_INFINITY;
    const bMargin = b.marginPercent ?? Number.POSITIVE_INFINITY;
    if (aMargin !== bMargin) return aMargin - bMargin;
    return a.totalProfit - b.totalProfit;
  });

  const toItem = (
    group: OperationalDreDimensionGroup,
    value: number,
    secondaryLabel?: string,
    secondaryValue?: string,
  ): VehicleHighlightItem => ({
    id: group.dimensionKey,
    name: group.label,
    value,
    secondaryLabel,
    secondaryValue,
  });

  const formatMargin = (value: number | null) =>
    value == null
      ? '—'
      : `${value.toLocaleString('pt-BR', {maximumFractionDigits: 1})}%`;

  return {
    highestRevenue: toItem(byRevenue[0], byRevenue[0].totalRevenue),
    highestProfit: toItem(byProfit[0], byProfit[0].totalProfit),
    highestCost: toItem(byCost[0], byCost[0].totalCost),
    lowestProfitability: toItem(
      byMargin[0],
      byMargin[0].totalProfit,
      'Margem',
      formatMargin(byMargin[0].marginPercent),
    ),
  };
}
