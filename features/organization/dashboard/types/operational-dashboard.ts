import type {TripStatus} from '@/features/trips/types';

export interface OperationalTripSummaryRow {
  id: string;
  tripNumber: string;
  customerName: string;
  vehiclePlate: string;
  driverName: string;
  tripStatus: TripStatus;
}

export interface OperationalDashboardData {
  trips: {
    programmed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
  };
  financial: {
    totalFreight: number;
    totalExpenses: number;
    operationalResult: number;
    averageFreight: number;
    averageExpense: number;
    averageResult: number;
  };
  registries: {
    activeCustomers: number;
    activeVehicles: number;
    activeDrivers: number;
    activeRoutes: number;
  };
  fleet: {
    available: number;
    onTrip: number;
    maintenance: number;
  };
  drivers: {
    available: number;
    onTrip: number;
    inactive: number;
  };
  recentTrips: OperationalTripSummaryRow[];
}
