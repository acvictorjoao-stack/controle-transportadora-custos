import type {OperationalDreRouteGroup} from '@/features/dre/types';
import type {FinancialDashboardData} from '@/features/financial-dashboard/types';
import type {MaintenanceStats} from '@/features/maintenance/types';

import {classifyMarginStatus} from './margin-status';
import type {TopCustomerRankingItem} from './rankings';

export type OperationalAlertVariant = 'warning' | 'destructive' | 'info';

export interface OperationalAlertItem {
  id: string;
  title: string;
  description: string;
  variant: OperationalAlertVariant;
}

function countDueToday(
  upcoming: FinancialDashboardData['proximosVencimentos'],
  todayIso: string,
): number {
  return upcoming.filter((row) => row.dueDate === todayIso).length;
}

function localTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Monta alertas inteligentes a partir de dados já carregados (sem novas queries).
 */
export function buildOperationalAlerts(input: {
  financial: FinancialDashboardData;
  maintenance: Pick<MaintenanceStats, 'overdueSchedules'>;
  currentRoutes: OperationalDreRouteGroup[];
  topCustomers: TopCustomerRankingItem[];
  previousCustomers: TopCustomerRankingItem[];
}): OperationalAlertItem[] {
  const alerts: OperationalAlertItem[] = [];
  const today = localTodayIso();
  const dueToday = countDueToday(input.financial.proximosVencimentos, today);

  if (dueToday > 0) {
    alerts.push({
      id: 'contas-vencem-hoje',
      title: `${dueToday} conta${dueToday === 1 ? '' : 's'} vence${dueToday === 1 ? '' : 'm'} hoje`,
      description: 'Revise contas a pagar e a receber com vencimento no dia.',
      variant: 'warning',
    });
  }

  if (input.maintenance.overdueSchedules > 0) {
    const count = input.maintenance.overdueSchedules;
    alerts.push({
      id: 'manutencao-atrasada',
      title: `${count} veículo${count === 1 ? '' : 's'} com manutenção atrasada`,
      description: 'Há agendamentos de manutenção vencidos na frota.',
      variant: 'destructive',
    });
  }

  for (const route of input.currentRoutes) {
    if (route.route.id == null) continue;
    if (route.totalRevenue <= 0 && route.totalCost <= 0) continue;
    if (classifyMarginStatus(route.marginPercent) !== 'critica') continue;

    alerts.push({
      id: `rota-margem-${route.dimensionKey}`,
      title: `Rota ${route.label} abaixo da margem mínima`,
      description: `Margem atual: ${
        route.marginPercent == null
          ? '—'
          : `${route.marginPercent.toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
            })}%`
      }.`,
      variant: 'destructive',
    });

    if (alerts.length >= 6) break;
  }

  for (const customer of input.topCustomers.slice(0, 5)) {
    const previous = input.previousCustomers.find((item) => item.id === customer.id);
    if (!previous || previous.profit <= 0) continue;
    const drop = (previous.profit - customer.profit) / previous.profit;
    if (drop < 0.2) continue;

    alerts.push({
      id: `cliente-queda-${customer.id}`,
      title: `Cliente ${customer.name} apresentou queda de rentabilidade`,
      description: `Lucro ${Math.round(drop * 100)}% abaixo do período anterior.`,
      variant: 'warning',
    });
  }

  const unique = new Map(alerts.map((alert) => [alert.id, alert]));
  return Array.from(unique.values()).slice(0, 8);
}
