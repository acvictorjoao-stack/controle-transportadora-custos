import type {Trip, TripStatus} from '../types';

const STARTABLE_STATUSES: TripStatus[] = ['planned', 'scheduled', 'loading', 'waiting'];
const COMPLETABLE_STATUSES: TripStatus[] = ['in_progress', 'delivering'];
const CANCELLABLE_STATUSES: TripStatus[] = [
  'planned',
  'scheduled',
  'loading',
  'waiting',
  'in_progress',
  'delivering',
];

export function canStartTrip(status: TripStatus): boolean {
  return STARTABLE_STATUSES.includes(status);
}

export function canCompleteTrip(status: TripStatus): boolean {
  return COMPLETABLE_STATUSES.includes(status);
}

export function canCancelTrip(status: TripStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export function getTripFreightValue(trip: Pick<Trip, 'contractedFreightValue' | 'actualFreightValue'>): number {
  return trip.actualFreightValue ?? trip.contractedFreightValue ?? 0;
}
