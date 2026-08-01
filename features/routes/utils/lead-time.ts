/** Minutes in one lead-time day (24h). Used to sync lead_time_minutes for trip snapshots. */
export const MINUTES_PER_LEAD_DAY = 24 * 60;

export function leadMinutesFromDays(days: number): number {
  return days * MINUTES_PER_LEAD_DAY;
}

/**
 * Resolve lead time in days from the preferred column or legacy minutes.
 * Legacy non-multiples of 1440 are ceiled to at least 1 day.
 */
export function leadDaysFromStored(input: {
  leadTimeDays?: number | null;
  leadTimeMinutes?: number | null;
}): number | null {
  if (input.leadTimeDays != null && Number.isFinite(input.leadTimeDays)) {
    return Math.max(1, Math.trunc(input.leadTimeDays));
  }
  if (input.leadTimeMinutes != null && Number.isFinite(input.leadTimeMinutes)) {
    if (input.leadTimeMinutes % MINUTES_PER_LEAD_DAY === 0) {
      return Math.max(1, input.leadTimeMinutes / MINUTES_PER_LEAD_DAY);
    }
    return Math.max(1, Math.ceil(input.leadTimeMinutes / MINUTES_PER_LEAD_DAY));
  }
  return null;
}

export function addLeadTimeDaysIso(
  iso: string | null | undefined,
  days: number | null | undefined,
): string | null {
  if (!iso || days == null || !Number.isFinite(days)) return null;
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return new Date(ms + days * MINUTES_PER_LEAD_DAY * 60_000).toISOString();
}
