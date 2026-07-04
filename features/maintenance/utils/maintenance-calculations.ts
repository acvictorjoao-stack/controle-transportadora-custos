import type {MaintenanceStatus} from '../types';

export interface MaintenanceMetricsInput {
  openedAt: string;
  completedAt?: string | null;
  maintenanceStatus: MaintenanceStatus;
  odometerKm?: number | null;
  partsTotal?: number;
  servicesTotal?: number;
  finalAmount?: number | null;
}

export interface MaintenanceMetrics {
  downtimeHours: number | null;
  totalCost: number;
  costPerKm: number | null;
}

export function calculateMaintenanceMetrics(
  input: MaintenanceMetricsInput,
): MaintenanceMetrics {
  const partsTotal = input.partsTotal ?? 0;
  const servicesTotal = input.servicesTotal ?? 0;
  const totalCost = input.finalAmount ?? partsTotal + servicesTotal;

  let downtimeHours: number | null = null;
  if (
    input.maintenanceStatus === 'completed' &&
    input.completedAt &&
    input.openedAt
  ) {
    const opened = new Date(input.openedAt).getTime();
    const completed = new Date(input.completedAt).getTime();
    if (completed > opened) {
      downtimeHours = Math.round(((completed - opened) / (1000 * 60 * 60)) * 100) / 100;
    }
  }

  let costPerKm: number | null = null;
  if (input.odometerKm && input.odometerKm > 0) {
    costPerKm = Math.round((totalCost / input.odometerKm) * 10000) / 10000;
  }

  return {downtimeHours, totalCost, costPerKm};
}

export function calculatePartTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}
