import type {Trip, TripOccurrence, TripStatus} from '@/features/trips/types';
import {TRIP_OCCURRENCE_TYPE_LABELS} from '@/features/trips/types';
import {ROUTES} from '@/constants/routes/paths';

import type {
  BranchOperationalRow,
  ChartPoint,
  CustomerOperationalRow,
  DrillDownBranchNode,
  OperationalAlertItem,
  OperationalChartsData,
  OperationalHealthStatus,
  OperationalIntelligenceData,
  OperationalKpis,
  OperationalTimelineTrip,
  RouteOperationalRow,
  TimelineEvent,
} from '../types';

export const IN_PROGRESS_STATUSES: TripStatus[] = [
  'loading',
  'in_progress',
  'delivering',
  'waiting',
];

export const PENDING_DELIVERY_STATUSES: TripStatus[] = [
  'loading',
  'in_progress',
  'delivering',
  'waiting',
  'planned',
  'scheduled',
];

const NEAR_SLA_MS = 60 * 60_000;
const STOPPED_MS = 4 * 60 * 60_000;
const SLA_EXCELENTE = 90;
const SLA_ATENCAO = 75;

export function classifyOperationalSla(
  slaPercent: number | null | undefined,
): OperationalHealthStatus {
  if (slaPercent == null || !Number.isFinite(slaPercent)) return 'critica';
  if (slaPercent >= SLA_EXCELENTE) return 'excelente';
  if (slaPercent >= SLA_ATENCAO) return 'atencao';
  return 'critica';
}

export function formatOperationalStatus(status: OperationalHealthStatus): string {
  const labels = {
    excelente: '🟢 Excelente',
    atencao: '🟡 Atenção',
    critica: '🔴 Crítico',
  } as const;
  return labels[status];
}

export function isTripInProgress(trip: Trip): boolean {
  return IN_PROGRESS_STATUSES.includes(trip.tripStatus);
}

export function isTripDelayed(trip: Trip, now = new Date()): boolean {
  if (trip.tripStatus === 'cancelled') return false;

  if (trip.arrivedAt && trip.plannedArrivalAt) {
    return new Date(trip.arrivedAt).getTime() > new Date(trip.plannedArrivalAt).getTime();
  }

  if (isTripInProgress(trip) && trip.plannedArrivalAt) {
    return now.getTime() > new Date(trip.plannedArrivalAt).getTime();
  }

  if (trip.completedAt && trip.plannedCompletionAt) {
    return new Date(trip.completedAt).getTime() > new Date(trip.plannedCompletionAt).getTime();
  }

  return false;
}

export function isNearSla(trip: Trip, now = new Date()): boolean {
  if (!isTripInProgress(trip) || !trip.plannedArrivalAt) return false;
  if (isTripDelayed(trip, now)) return false;
  const remaining = new Date(trip.plannedArrivalAt).getTime() - now.getTime();
  return remaining > 0 && remaining <= NEAR_SLA_MS;
}

export function isTripSlaMet(trip: Trip): boolean | null {
  if (trip.tripStatus !== 'completed') return null;
  if (trip.arrivedAt && trip.plannedArrivalAt) {
    return new Date(trip.arrivedAt).getTime() <= new Date(trip.plannedArrivalAt).getTime();
  }
  if (trip.completedAt && trip.plannedCompletionAt) {
    return (
      new Date(trip.completedAt).getTime() <=
      new Date(trip.plannedCompletionAt).getTime()
    );
  }
  return null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isSameLocalDay(iso: string | null, day: Date): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  return (
    date.getFullYear() === day.getFullYear() &&
    date.getMonth() === day.getMonth() &&
    date.getDate() === day.getDate()
  );
}

function localDayKey(iso: string): string {
  const date = new Date(iso);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDayLabel(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});
}

function measuredLeadMinutes(trip: Trip): number | null {
  if (trip.leadTimeMinutes != null && Number.isFinite(trip.leadTimeMinutes)) {
    return trip.leadTimeMinutes;
  }
  if (trip.departedAt && trip.arrivedAt) {
    const ms =
      new Date(trip.arrivedAt).getTime() - new Date(trip.departedAt).getTime();
    if (ms >= 0) return ms / 60_000;
  }
  return null;
}

function measuredUnloadMinutes(trip: Trip): number | null {
  if (trip.unloadTimeMinutes != null && Number.isFinite(trip.unloadTimeMinutes)) {
    return trip.unloadTimeMinutes;
  }
  if (trip.arrivedAt && trip.completedAt) {
    const ms =
      new Date(trip.completedAt).getTime() - new Date(trip.arrivedAt).getTime();
    if (ms >= 0) return ms / 60_000;
  }
  return null;
}

function branchKey(trip: Trip): string {
  return trip.branchId ?? '__none__';
}

function branchLabel(trip: Trip): string {
  return trip.branchName?.trim() || 'Sem filial';
}

function customerKey(trip: Trip): string {
  return trip.customerId ?? trip.customerName ?? trip.clientName ?? '__none__';
}

function customerLabel(trip: Trip): string {
  return trip.customerName?.trim() || trip.clientName?.trim() || 'Sem cliente';
}

function routeKey(trip: Trip): string {
  return trip.routeId ?? trip.routeName ?? trip.route ?? '__none__';
}

function routeLabel(trip: Trip): string {
  return trip.routeName?.trim() || trip.route?.trim() || 'Sem rota';
}

export function buildTripTimelineEvents(trip: Trip): TimelineEvent[] {
  return [
    {
      id: `${trip.id}-start`,
      label: 'Viagem iniciada',
      at: trip.departedAt ?? trip.startedAt,
      done: Boolean(trip.departedAt ?? trip.startedAt),
    },
    {
      id: `${trip.id}-arrival`,
      label: 'Chegada Cliente',
      at: trip.arrivedAt,
      done: Boolean(trip.arrivedAt),
    },
    {
      id: `${trip.id}-unload`,
      label: 'Descarga',
      at: trip.arrivedAt && trip.unloadTimeMinutes != null
        ? new Date(
            new Date(trip.arrivedAt).getTime() + trip.unloadTimeMinutes * 60_000,
          ).toISOString()
        : trip.arrivedAt,
      done: Boolean(trip.arrivedAt),
    },
    {
      id: `${trip.id}-exit`,
      label: 'Saída',
      at: trip.completedAt,
      done: Boolean(trip.completedAt),
    },
    {
      id: `${trip.id}-done`,
      label: 'Finalizada',
      at: trip.completedAt,
      done: trip.tripStatus === 'completed',
    },
  ];
}

function slaOfTrips(trips: Trip[]): number | null {
  const evaluated = trips
    .map((trip) => isTripSlaMet(trip))
    .filter((value): value is boolean => value !== null);
  if (evaluated.length === 0) return null;
  const met = evaluated.filter(Boolean).length;
  return (met / evaluated.length) * 100;
}

export function buildOperationalKpis(
  trips: Trip[],
  occurrences: TripOccurrence[],
  now = new Date(),
): OperationalKpis {
  const activeTripIds = new Set(
    trips.filter((trip) => isTripInProgress(trip)).map((trip) => trip.id),
  );

  return {
    tripsInProgress: trips.filter((trip) => isTripInProgress(trip)).length,
    tripsCompletedToday: trips.filter(
      (trip) =>
        trip.tripStatus === 'completed' && isSameLocalDay(trip.completedAt, now),
    ).length,
    tripsDelayed: trips.filter((trip) => isTripDelayed(trip, now)).length,
    pendingDeliveries: trips.filter((trip) =>
      PENDING_DELIVERY_STATUSES.includes(trip.tripStatus),
    ).length,
    averageLeadTimeMinutes: average(
      trips
        .map((trip) => measuredLeadMinutes(trip))
        .filter((value): value is number => value != null),
    ),
    slaPercent: slaOfTrips(trips),
    openOccurrences: (() => {
      const onActive = occurrences.filter((item) =>
        activeTripIds.has(item.tripId),
      ).length;
      return onActive > 0 ? onActive : occurrences.length;
    })(),
    averageUnloadMinutes: average(
      trips
        .map((trip) => measuredUnloadMinutes(trip))
        .filter((value): value is number => value != null),
    ),
  };
}

export function buildBranchRows(
  trips: Trip[],
  occurrences: TripOccurrence[],
  now = new Date(),
): BranchOperationalRow[] {
  const occurrenceByTrip = new Map<string, number>();
  for (const item of occurrences) {
    occurrenceByTrip.set(item.tripId, (occurrenceByTrip.get(item.tripId) ?? 0) + 1);
  }

  const groups = new Map<
    string,
    {
      name: string;
      trips: Trip[];
      occurrenceCount: number;
    }
  >();

  for (const trip of trips) {
    const key = branchKey(trip);
    const existing = groups.get(key);
    if (existing) {
      existing.trips.push(trip);
      existing.occurrenceCount += occurrenceByTrip.get(trip.id) ?? 0;
      continue;
    }
    groups.set(key, {
      name: branchLabel(trip),
      trips: [trip],
      occurrenceCount: occurrenceByTrip.get(trip.id) ?? 0,
    });
  }

  // Occurrences with branch_id but trip maybe outside snapshot
  for (const item of occurrences) {
    if (!item.branchId) continue;
    const group = groups.get(item.branchId);
    if (!group) continue;
    // already counted via trip when present
  }

  return Array.from(groups.entries())
    .map(([id, group]) => {
      const slaPercent = slaOfTrips(group.trips);
      return {
        id,
        name: group.name,
        activeTrips: group.trips.filter((trip) => isTripInProgress(trip)).length,
        delayedTrips: group.trips.filter((trip) => isTripDelayed(trip, now)).length,
        completedTrips: group.trips.filter((trip) => trip.tripStatus === 'completed')
          .length,
        slaPercent,
        averageLeadTimeMinutes: average(
          group.trips
            .map((trip) => measuredLeadMinutes(trip))
            .filter((value): value is number => value != null),
        ),
        occurrenceCount: group.occurrenceCount,
        status: classifyOperationalSla(slaPercent),
      } satisfies BranchOperationalRow;
    })
    .sort((a, b) => {
      const aSla = a.slaPercent ?? -1;
      const bSla = b.slaPercent ?? -1;
      if (aSla !== bSla) return aSla - bSla;
      return b.delayedTrips - a.delayedTrips;
    });
}

export function buildCustomerRows(
  trips: Trip[],
  occurrences: TripOccurrence[],
  now = new Date(),
): CustomerOperationalRow[] {
  const occurrenceByTrip = new Map<string, number>();
  for (const item of occurrences) {
    occurrenceByTrip.set(item.tripId, (occurrenceByTrip.get(item.tripId) ?? 0) + 1);
  }

  const groups = new Map<string, {name: string; trips: Trip[]; occurrenceCount: number}>();
  for (const trip of trips) {
    const key = customerKey(trip);
    if (key === '__none__') continue;
    const existing = groups.get(key);
    if (existing) {
      existing.trips.push(trip);
      existing.occurrenceCount += occurrenceByTrip.get(trip.id) ?? 0;
      continue;
    }
    groups.set(key, {
      name: customerLabel(trip),
      trips: [trip],
      occurrenceCount: occurrenceByTrip.get(trip.id) ?? 0,
    });
  }

  return Array.from(groups.entries()).map(([id, group]) => ({
    id,
    name: group.name,
    delayedTrips: group.trips.filter((trip) => isTripDelayed(trip, now)).length,
    occurrenceCount: group.occurrenceCount,
    slaPercent: slaOfTrips(group.trips),
    tripCount: group.trips.length,
  }));
}

export function buildRouteRows(
  trips: Trip[],
  now = new Date(),
): RouteOperationalRow[] {
  const groups = new Map<string, {name: string; trips: Trip[]}>();
  for (const trip of trips) {
    const key = routeKey(trip);
    if (key === '__none__') continue;
    const existing = groups.get(key);
    if (existing) {
      existing.trips.push(trip);
      continue;
    }
    groups.set(key, {name: routeLabel(trip), trips: [trip]});
  }

  return Array.from(groups.entries()).map(([id, group]) => {
    const slaPercent = slaOfTrips(group.trips);
    return {
      id,
      name: group.name,
      delayedTrips: group.trips.filter((trip) => isTripDelayed(trip, now)).length,
      averageLeadTimeMinutes: average(
        group.trips
          .map((trip) => measuredLeadMinutes(trip))
          .filter((value): value is number => value != null),
      ),
      slaPercent,
      tripCount: group.trips.length,
      status: classifyOperationalSla(slaPercent),
      rentabilidadeHref: ROUTES.dashboardRentabilidadeRotas,
    };
  });
}

export function buildOperationalAlerts(input: {
  trips: Trip[];
  occurrences: TripOccurrence[];
  branches: BranchOperationalRow[];
  customers: CustomerOperationalRow[];
  now?: Date;
}): OperationalAlertItem[] {
  const now = input.now ?? new Date();
  const alerts: OperationalAlertItem[] = [];

  const delayed = input.trips.filter((trip) => isTripDelayed(trip, now)).length;
  if (delayed > 0) {
    alerts.push({
      id: 'trips-delayed',
      tone: 'critical',
      title: `${delayed} viagem${delayed === 1 ? '' : 'ns'} em atraso`,
      description: 'Priorize entregas fora do SLA.',
    });
  }

  const near = input.trips.filter((trip) => isNearSla(trip, now)).length;
  if (near > 0) {
    alerts.push({
      id: 'trips-near-sla',
      tone: 'warning',
      title: `${near} viagem${near === 1 ? '' : 'ns'} próxima${near === 1 ? '' : 's'} do SLA`,
      description: 'Risco de atraso na próxima hora.',
    });
  }

  for (const customer of input.customers
    .filter((item) => item.occurrenceCount > 0)
    .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
    .slice(0, 3)) {
    if (customer.occurrenceCount < 2) continue;
    alerts.push({
      id: `customer-occ-${customer.id}`,
      tone: 'critical',
      title: `Cliente ${customer.name} possui ${customer.occurrenceCount} ocorrências`,
      description: 'Acompanhe o histórico operacional do cliente.',
    });
  }

  for (const branch of input.branches.slice(0, 3)) {
    if (branch.status !== 'critica' && branch.status !== 'atencao') continue;
    alerts.push({
      id: `branch-${branch.id}`,
      tone: branch.status === 'critica' ? 'critical' : 'warning',
      title: `Filial ${branch.name} abaixo da meta`,
      description:
        branch.slaPercent == null
          ? 'SLA sem base no período.'
          : `SLA atual: ${branch.slaPercent.toLocaleString('pt-BR', {
              maximumFractionDigits: 1,
            })}%.`,
    });
  }

  for (const trip of input.trips) {
    if (trip.tripStatus !== 'waiting' || !trip.arrivedAt || !trip.vehiclePlate) {
      continue;
    }
    const stoppedMs = now.getTime() - new Date(trip.arrivedAt).getTime();
    if (stoppedMs < STOPPED_MS) continue;
    const hours = Math.floor(stoppedMs / 3_600_000);
    alerts.push({
      id: `vehicle-stopped-${trip.id}`,
      tone: 'critical',
      title: `Caminhão ${trip.vehiclePlate} parado há ${hours} hora${hours === 1 ? '' : 's'}`,
      description: `Viagem ${trip.tripNumber} em espera.`,
    });
  }

  return alerts.slice(0, 10);
}

export function buildFeaturedTimeline(
  trips: Trip[],
  now = new Date(),
): OperationalTimelineTrip | null {
  const featured =
    trips.find((trip) => isTripDelayed(trip, now) && isTripInProgress(trip)) ??
    trips.find((trip) => isTripInProgress(trip)) ??
    trips.find((trip) => trip.tripStatus === 'completed') ??
    null;

  if (!featured) return null;

  return {
    tripId: featured.id,
    tripNumber: featured.tripNumber,
    customerName: featured.customerName ?? featured.clientName,
    vehiclePlate: featured.vehiclePlate,
    events: buildTripTimelineEvents(featured),
  };
}

export function buildOperationalCharts(
  trips: Trip[],
  occurrences: TripOccurrence[],
  now = new Date(),
): OperationalChartsData {
  const tripsByHour = Array.from({length: 24}, (_, hour) => {
    const count = trips.filter((trip) => {
      const stamp = trip.departedAt ?? trip.startedAt ?? trip.createdAt;
      return new Date(stamp).getHours() === hour;
    }).length;
    return {
      key: String(hour),
      label: `${String(hour).padStart(2, '0')}h`,
      value: count,
    };
  }).filter((point) => point.value > 0);

  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    dayKeys.push(localDayKey(day.toISOString()));
  }

  const dailySla: ChartPoint[] = dayKeys
    .map((key) => {
      const dayTrips = trips.filter(
        (trip) => trip.completedAt && localDayKey(trip.completedAt) === key,
      );
      const sla = slaOfTrips(dayTrips);
      if (sla == null) return null;
      return {
        key,
        label: formatDayLabel(key),
        value: Math.round(sla),
      };
    })
    .filter((point): point is ChartPoint => point != null);

  const leadTimeByDay: ChartPoint[] = dayKeys
    .map((key) => {
      const values = trips
        .filter((trip) => trip.completedAt && localDayKey(trip.completedAt) === key)
        .map((trip) => measuredLeadMinutes(trip))
        .filter((value): value is number => value != null);
      const avg = average(values);
      if (avg == null) return null;
      return {
        key,
        label: formatDayLabel(key),
        value: Math.round(avg),
      };
    })
    .filter((point): point is ChartPoint => point != null);

  const completedDeliveries: ChartPoint[] = dayKeys
    .map((key) => ({
      key,
      label: formatDayLabel(key),
      value: trips.filter(
        (trip) =>
          trip.tripStatus === 'completed' &&
          trip.completedAt &&
          localDayKey(trip.completedAt) === key,
      ).length,
    }))
    .filter((point) => point.value > 0);

  const occurrencesByReasonMap = new Map<string, number>();
  for (const item of occurrences) {
    const label = TRIP_OCCURRENCE_TYPE_LABELS[item.occurrenceType] ?? item.occurrenceType;
    occurrencesByReasonMap.set(
      label,
      (occurrencesByReasonMap.get(label) ?? 0) + 1,
    );
  }

  const occurrencesByReason = Array.from(occurrencesByReasonMap.entries())
    .map(([label, value]) => ({key: label, label, value}))
    .sort((a, b) => b.value - a.value);

  return {
    tripsByHour,
    dailySla,
    leadTimeByDay,
    completedDeliveries,
    occurrencesByReason,
  };
}

export function buildDrillDown(
  trips: Trip[],
  occurrences: TripOccurrence[],
  now = new Date(),
): DrillDownBranchNode[] {
  const occByTrip = new Map<string, TripOccurrence[]>();
  for (const item of occurrences) {
    const list = occByTrip.get(item.tripId) ?? [];
    list.push(item);
    occByTrip.set(item.tripId, list);
  }

  const branches = new Map<string, DrillDownBranchNode>();

  for (const trip of trips) {
    const bKey = branchKey(trip);
    const branch =
      branches.get(bKey) ??
      ({
        id: bKey,
        label: branchLabel(trip),
        customers: [],
      } satisfies DrillDownBranchNode);
    if (!branches.has(bKey)) branches.set(bKey, branch);

    const cKey = customerKey(trip);
    let customer = branch.customers.find((item) => item.id === cKey);
    if (!customer) {
      customer = {id: cKey, label: customerLabel(trip), routes: []};
      branch.customers.push(customer);
    }

    const rKey = routeKey(trip);
    let route = customer.routes.find((item) => item.id === rKey);
    if (!route) {
      route = {id: rKey, label: routeLabel(trip), trips: []};
      customer.routes.push(route);
    }

    route.trips.push({
      id: trip.id,
      tripNumber: trip.tripNumber,
      status: trip.tripStatus,
      delayed: isTripDelayed(trip, now),
      timeline: buildTripTimelineEvents(trip),
      occurrences: (occByTrip.get(trip.id) ?? []).map((item) => ({
        id: item.id,
        type: TRIP_OCCURRENCE_TYPE_LABELS[item.occurrenceType] ?? item.occurrenceType,
        description: item.description,
        occurredAt: item.occurredAt,
      })),
    });
  }

  return Array.from(branches.values());
}

/**
 * Composição pura da Inteligência Operacional a partir de viagens + ocorrências.
 */
export function composeOperationalIntelligence(input: {
  trips: Trip[];
  occurrences: TripOccurrence[];
  now?: Date;
}): OperationalIntelligenceData {
  const now = input.now ?? new Date();
  const {trips, occurrences} = input;

  const kpis = buildOperationalKpis(trips, occurrences, now);
  const branchRows = buildBranchRows(trips, occurrences, now);
  const customerRows = buildCustomerRows(trips, occurrences, now);
  const routeRows = buildRouteRows(trips, now);

  return {
    generatedAt: now.toISOString(),
    kpis,
    branchHeatMap: branchRows,
    branchRanking: [...branchRows],
    customersByDelay: [...customerRows]
      .sort((a, b) => b.delayedTrips - a.delayedTrips)
      .filter((item) => item.delayedTrips > 0)
      .slice(0, 10),
    customersByOccurrences: [...customerRows]
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
      .filter((item) => item.occurrenceCount > 0)
      .slice(0, 10),
    customersBySla: [...customerRows]
      .filter((item) => item.slaPercent != null)
      .sort((a, b) => (b.slaPercent ?? 0) - (a.slaPercent ?? 0))
      .slice(0, 10),
    criticalRoutes: [...routeRows]
      .filter((item) => item.status === 'critica' || item.delayedTrips > 0)
      .sort((a, b) => b.delayedTrips - a.delayedTrips)
      .slice(0, 10),
    routesByLeadTime: [...routeRows]
      .filter((item) => item.averageLeadTimeMinutes != null)
      .sort(
        (a, b) =>
          (b.averageLeadTimeMinutes ?? 0) - (a.averageLeadTimeMinutes ?? 0),
      )
      .slice(0, 10),
    alerts: buildOperationalAlerts({
      trips,
      occurrences,
      branches: branchRows,
      customers: customerRows,
      now,
    }),
    timeline: buildFeaturedTimeline(trips, now),
    charts: buildOperationalCharts(trips, occurrences, now),
    drillDown: buildDrillDown(trips, occurrences, now),
    tripsNeedingAttention: trips
      .filter((trip) => isTripDelayed(trip, now) || isNearSla(trip, now))
      .slice(0, 15)
      .map((trip) => ({
        id: trip.id,
        tripNumber: trip.tripNumber,
        customerName: trip.customerName ?? trip.clientName,
        branchName: trip.branchName,
        reason: isTripDelayed(trip, now) ? 'Em atraso' : 'Próxima do SLA',
      })),
  };
}
