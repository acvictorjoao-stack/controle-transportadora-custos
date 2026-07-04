import type {LucideIcon} from 'lucide-react';

import type {CustomerStats} from '@/features/customers/types';
import type {DriverStats} from '@/features/drivers/types';
import type {FinancialStats} from '@/features/financial/types';
import type {FuelStats} from '@/features/fuel/types';
import type {MaintenanceStats} from '@/features/maintenance/types';
import type {TireStats} from '@/features/tires/types';
import type {TripStats} from '@/features/trips/types';

export interface DashboardKpiData {
  id: string;
  label: string;
  value: string;
  description: string;
  trend: {value: string; positive: boolean};
}

export interface DashboardChartData {
  id: string;
  title: string;
  description: string;
}

export interface DashboardAlertData {
  id: string;
  title: string;
  description: string;
  variant: 'warning' | 'destructive' | 'info';
  time: string;
}

export interface DashboardActivityData {
  id: string;
  title: string;
  description: string;
  time: string;
}

export interface DashboardDueItemData {
  id: string;
  title: string;
  amount: string;
  dueDate: string;
}

export interface DashboardRankingItemData {
  id: string;
  name: string;
  value: string;
  subtitle: string;
}

export interface CompanyDashboardData {
  header: {
    title: string;
    description: string;
    companyName: string;
  };
  kpis: DashboardKpiData[];
  charts: DashboardChartData[];
  alerts: DashboardAlertData[];
  activities: DashboardActivityData[];
  upcomingDue: DashboardDueItemData[];
  rankings: {
    postos: DashboardRankingItemData[];
    veiculos: DashboardRankingItemData[];
    marcas: DashboardRankingItemData[];
    centrosCusto: DashboardRankingItemData[];
    viagens: DashboardRankingItemData[];
  };
  counts: {
    branches: number;
    members: number;
    vehicles: number;
    drivers: number;
    trips: number;
    fuelRecords: number;
    maintenanceRecords: number;
    tires: number;
  };
  vehicleStats: {
    total: number;
    active: number;
    maintenance: number;
    inactive: number;
    sold: number;
    averageOdometerKm: number;
  };
  driverStats: DriverStats;
  tripStats: TripStats;
  fuelStats: FuelStats;
  maintenanceStats: MaintenanceStats;
  tireStats: TireStats;
  financialStats: FinancialStats;
  customerStats: CustomerStats;
}

export type {LucideIcon};
