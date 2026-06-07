export const BASE_SCROLL_DISTANCE_METERS = 100;
export const SCROLL_MULTIPLIER_STEPS = [1, 10, 100, 1000] as const;
export const DEFAULT_SCROLL_MULTIPLIER = SCROLL_MULTIPLIER_STEPS[0];

function getScrollMultiplierIndex(value: number): number {
  const normalizedValue = normalizeScrollMultiplier(value);
  return SCROLL_MULTIPLIER_STEPS.findIndex((candidate) => candidate === normalizedValue);
}

export function normalizeScrollMultiplier(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_SCROLL_MULTIPLIER;
  }

  return SCROLL_MULTIPLIER_STEPS.reduce((closest, candidate) => (
    Math.abs(candidate - value) < Math.abs(closest - value) ? candidate : closest
  ), DEFAULT_SCROLL_MULTIPLIER);
}

export function stepScrollMultiplier(current: number, direction: -1 | 1): number {
  const currentIndex = getScrollMultiplierIndex(current);
  const nextIndex = Math.max(0, Math.min(SCROLL_MULTIPLIER_STEPS.length - 1, currentIndex + direction));
  return SCROLL_MULTIPLIER_STEPS[nextIndex];
}

export function canDecreaseScrollMultiplier(current: number): boolean {
  return getScrollMultiplierIndex(current) > 0;
}

export function canIncreaseScrollMultiplier(current: number): boolean {
  return getScrollMultiplierIndex(current) < SCROLL_MULTIPLIER_STEPS.length - 1;
}

export function getScrollDistanceMeters(multiplier: number): number {
  return normalizeScrollMultiplier(multiplier) * BASE_SCROLL_DISTANCE_METERS;
}

export function formatScrollMultiplierValue(multiplier: number): string {
  const distanceInMeters = getScrollDistanceMeters(multiplier);

  if (distanceInMeters < 1000) {
    return `${distanceInMeters} m`;
  }

  const distanceInKilometers = distanceInMeters / 1000;
  const formattedKilometers = Number.isInteger(distanceInKilometers)
    ? String(distanceInKilometers)
    : distanceInKilometers.toFixed(1).replace(/\.0$/, "");

  return `${formattedKilometers} km`;
}