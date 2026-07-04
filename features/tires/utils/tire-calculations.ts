export function isReplacementDue(
  remainingLifeKm: number | null,
  lastTreadDepthMm: number | null,
  tireStatus: string,
): boolean {
  if (tireStatus !== 'installed') return false;
  if (remainingLifeKm !== null && remainingLifeKm <= 5000) return true;
  if (lastTreadDepthMm !== null && lastTreadDepthMm <= 2) return true;
  return false;
}
