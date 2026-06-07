const DEFAULT_HALF_LIFE_MS = 90;
const DEFAULT_MAX_STEP_PER_FRAME = 300;
const DEFAULT_SNAP_DISTANCE = 0.2;

export type AltitudeMotorOptions = {
  current: number;
  target: number;
  deltaMs: number;
  halfLifeMs?: number;
  maxStepPerFrame?: number;
  minAltitude?: number;
  maxAltitude?: number;
  snapDistance?: number;
};

export function clampAltitude(
  value: number,
  minAltitude = 0,
  maxAltitude = Number.POSITIVE_INFINITY,
): number {
  return Math.max(minAltitude, Math.min(maxAltitude, value));
}

export function smoothToward(
  current: number,
  target: number,
  halfLifeMs: number,
  deltaMs: number,
): number {
  if (deltaMs <= 0) {
    return current;
  }

  if (halfLifeMs <= 0) {
    return target;
  }

  const decay = Math.exp(-deltaMs / (halfLifeMs / Math.LN2));
  return target + (current - target) * decay;
}

export function stepAltitudeMotor({
  current,
  target,
  deltaMs,
  halfLifeMs = DEFAULT_HALF_LIFE_MS,
  maxStepPerFrame = DEFAULT_MAX_STEP_PER_FRAME,
  minAltitude = 0,
  maxAltitude = Number.POSITIVE_INFINITY,
  snapDistance = DEFAULT_SNAP_DISTANCE,
}: AltitudeMotorOptions): number {
  const boundedTarget = clampAltitude(target, minAltitude, maxAltitude);

  if (Math.abs(boundedTarget - current) <= snapDistance) {
    return boundedTarget;
  }

  const smoothed = smoothToward(current, boundedTarget, halfLifeMs, deltaMs);
  const rawStep = smoothed - current;
  const clampedStep = Math.sign(rawStep) * Math.min(Math.abs(rawStep), maxStepPerFrame);
  const next = clampAltitude(current + clampedStep, minAltitude, maxAltitude);

  if (Math.abs(boundedTarget - next) <= snapDistance) {
    return boundedTarget;
  }

  return next;
}