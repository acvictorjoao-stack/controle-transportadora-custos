import type {Trip, TripOccurrence, TripStatus} from '@/features/trips/types';

export type OperationalHealthStatus = 'excelente' | 'atencao' | 'critica';

export interface OperationalKpis {
  tripsInProgress: number;
  tripsCompletedToday: number;
  tripsDelayed: number;
  pendingDeliveries: number;
  averageLeadTimeMinutes: number | null;
  slaPercent: number | null;
  openOccurrences: number;
  averageUnloadMinutes: number | null;
}

export interface BranchOperationalRow {
  id: string;
  name: string;
  activeTrips: number;
  delayedTrips: number;
  completedTrips: number;
  slaPercent: number | null;
  averageLeadTimeMinutes: number | null;
  occurrenceCount: number;
  status: OperationalHealthStatus;
}

export interface CustomerOperationalRow {
  id: string;
  name: string;
  delayedTrips: number;
  occurrenceCount: number;
  slaPercent: number | null;
  tripCount: number;
}

export interface RouteOperationalRow {
  id: string;
  name: string;
  delayedTrips: number;
  averageLeadTimeMinutes: number | null;
  slaPercent: number | null;
  tripCount: number;
  status: OperationalHealthStatus;
  /** Link operacional — rentabilidade fica em outra tela. */
  rentabilidadeHref: string;
}

export interface OperationalAlertItem {
  id: string;
  tone: 'critical' | 'warning';
  title: string;
  description?: string;
}

export interface TimelineEvent {
  id: string;
  label: string;
  at: string | null;
  done: boolean;
}

export interface OperationalTimelineTrip {
  tripId: string;
  tripNumber: string;
  customerName: string | null;
  vehiclePlate: string | null;
  events: TimelineEvent[];
}

export interface ChartPoint {
  key: string;
  label: string;
  value: number;
}

export interface OperationalChartsData {
  tripsByHour: ChartPoint[];
  dailySla: ChartPoint[];
  leadTimeByDay: ChartPoint[];
  completedDeliveries: ChartPoint[];
  occurrencesByReason: ChartPoint[];
}

export interface DrillDownBranchNode {
  id: string;
  label: string;
  customers: DrillDownCustomerNode[];
}

export interface DrillDownCustomerNode {
  id: string;
  label: string;
  routes: DrillDownRouteNode[];
}

export interface DrillDownRouteNode {
  id: string;
  label: string;
  trips: DrillDownTripNode[];
}

export interface DrillDownTripNode {
  id: string;
  tripNumber: string;
  status: TripStatus;
  delayed: boolean;
  timeline: TimelineEvent[];
  occurrences: Array<{
    id: string;
    type: string;
    description: string | null;
    occurredAt: string;
  }>;
}

export interface OperationalIntelligenceData {
  generatedAt: string;
  kpis: OperationalKpis;
  branchHeatMap: BranchOperationalRow[];
  branchRanking: BranchOperationalRow[];
  customersByDelay: CustomerOperationalRow[];
  customersByOccurrences: CustomerOperationalRow[];
  customersBySla: CustomerOperationalRow[];
  criticalRoutes: RouteOperationalRow[];
  routesByLeadTime: RouteOperationalRow[];
  alerts: OperationalAlertItem[];
  timeline: OperationalTimelineTrip | null;
  charts: OperationalChartsData;
  drillDown: DrillDownBranchNode[];
  tripsNeedingAttention: Array<{
    id: string;
    tripNumber: string;
    customerName: string | null;
    branchName: string | null;
    reason: string;
  }>;
}
