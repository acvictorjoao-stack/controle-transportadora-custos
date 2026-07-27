import type {
  OperationalDreCustomerGroup,
  OperationalDreData,
  OperationalDreRouteGroup,
  OperationalDreVehicleGroup,
} from '@/features/dre/types';

import type {InsightItem} from '../types';
import {percentChange} from './format';

const ROUTE_MARGIN_DROP_THRESHOLD = -10;
const CUSTOMER_REVENUE_UP_THRESHOLD = 15;
const CUSTOMER_PROFIT_LAG_THRESHOLD = 5;
const VEHICLE_COST_KM_ABOVE_AVG = 0.27;

function costDriverLabels(route: OperationalDreRouteGroup, previous?: OperationalDreRouteGroup): string[] {
  if (!previous) return [];
  const drivers: string[] = [];
  // Sem breakdown por rota de combustível/manutenção no grupo; usa custo total.
  const costDelta = percentChange(route.totalCost, previous.totalCost);
  if (costDelta != null && costDelta >= 8) {
    drivers.push('↑ custos operacionais');
  }
  const revenueDelta = percentChange(route.totalRevenue, previous.totalRevenue);
  if (revenueDelta != null && revenueDelta <= -5) {
    drivers.push('↓ receita');
  }
  return drivers;
}

function fuelMaintenanceHints(dre: OperationalDreData, previousDre?: OperationalDreData): string[] {
  if (!previousDre) return [];
  const hints: string[] = [];
  const fuelDelta = percentChange(dre.costs.fuel, previousDre.costs.fuel);
  const maintDelta = percentChange(
    dre.costs.maintenance,
    previousDre.costs.maintenance,
  );
  if (fuelDelta != null && fuelDelta >= 5) hints.push('↑ combustível');
  if (maintDelta != null && maintDelta >= 5) hints.push('↑ manutenção');
  return hints;
}

/**
 * Insights determinísticos a partir de DRE dimensional + agregados.
 */
export function buildExecutiveInsights(input: {
  dre: OperationalDreData;
  previousDre?: OperationalDreData;
  routes: OperationalDreRouteGroup[];
  previousRoutes: OperationalDreRouteGroup[];
  customers: OperationalDreCustomerGroup[];
  previousCustomers: OperationalDreCustomerGroup[];
  vehicles: OperationalDreVehicleGroup[];
}): InsightItem[] {
  const insights: InsightItem[] = [];
  const previousRouteByKey = new Map(
    input.previousRoutes.map((route) => [route.dimensionKey, route]),
  );
  const previousCustomerByKey = new Map(
    input.previousCustomers.map((customer) => [customer.dimensionKey, customer]),
  );

  const globalDrivers = fuelMaintenanceHints(input.dre, input.previousDre);

  for (const route of input.routes) {
    if (route.route.id == null) continue;
    const previous = previousRouteByKey.get(route.dimensionKey);
    if (!previous || previous.marginPercent == null || route.marginPercent == null) {
      continue;
    }
    const marginDelta = route.marginPercent - previous.marginPercent;
    if (marginDelta > ROUTE_MARGIN_DROP_THRESHOLD) continue;

    const drivers = [
      ...costDriverLabels(route, previous),
      ...globalDrivers,
    ];
    const uniqueDrivers = Array.from(new Set(drivers));

    insights.push({
      id: `route-margin-${route.dimensionKey}`,
      title: `Margem da rota ${route.label} caiu ${Math.abs(Math.round(marginDelta))}%.`,
      cause:
        uniqueDrivers.length > 0
          ? `Principal causa:\n${uniqueDrivers.join('\n')}`
          : undefined,
      suggestion: 'Revisar preço do frete e custos da rota.',
      severity: marginDelta <= -20 ? 'critical' : 'warning',
    });

    if (insights.length >= 6) break;
  }

  for (const customer of input.customers) {
    if (customer.customer.id == null) continue;
    const previous = previousCustomerByKey.get(customer.dimensionKey);
    if (!previous) continue;

    const revenueDelta = percentChange(customer.totalRevenue, previous.totalRevenue);
    const profitDelta = percentChange(customer.totalProfit, previous.totalProfit);
    if (
      revenueDelta == null ||
      profitDelta == null ||
      revenueDelta < CUSTOMER_REVENUE_UP_THRESHOLD ||
      profitDelta >= CUSTOMER_PROFIT_LAG_THRESHOLD
    ) {
      continue;
    }

    insights.push({
      id: `customer-lag-${customer.dimensionKey}`,
      title: `Cliente ${customer.label} aumentou ${Math.round(revenueDelta)}% da receita.`,
      cause: `Lucro cresceu apenas ${Math.round(profitDelta)}%.`,
      suggestion: 'Revisar preço do frete.',
      severity: 'warning',
    });
  }

  const withCostKm = input.vehicles.filter(
    (vehicle) =>
      vehicle.vehicle.id != null &&
      vehicle.costPerKm != null &&
      Number.isFinite(vehicle.costPerKm) &&
      vehicle.totalKm > 0,
  );
  if (withCostKm.length >= 2) {
    const avg =
      withCostKm.reduce((sum, vehicle) => sum + (vehicle.costPerKm ?? 0), 0) /
      withCostKm.length;

    for (const vehicle of withCostKm) {
      const costPerKm = vehicle.costPerKm!;
      if (avg <= 0) continue;
      const above = (costPerKm - avg) / avg;
      if (above < VEHICLE_COST_KM_ABOVE_AVG) continue;

      insights.push({
        id: `vehicle-costkm-${vehicle.dimensionKey}`,
        title: `Veículo ${vehicle.label} apresenta custo/km ${Math.round(above * 100)}% acima da média da frota.`,
        suggestion: 'Investigar consumo, manutenção e ociosidade.',
        severity: above >= 0.4 ? 'critical' : 'warning',
      });
    }
  }

  const unique = new Map(insights.map((item) => [item.id, item]));
  return Array.from(unique.values()).slice(0, 8);
}
