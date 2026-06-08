const DEFAULT_HALF_LIFE_MS = 90;
const DEFAULT_MAX_STEP_PER_FRAME = 300;
const DEFAULT_SNAP_DISTANCE = 0.2;
const DEFAULT_SETTLE_DURATION_MS = 560;
const MIN_ADAPTIVE_HALF_LIFE_MS = 18;

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

export type AdaptiveAltitudeMotorOptions = {
  current: number;
  target: number;
  deltaMs: number;
  snapDistance?: number;
  settleDurationMs?: number;
  baseHalfLifeMs?: number;
  baseMaxStepPerFrame?: number;
};

export type AdaptiveAltitudeMotorProfile = {
  halfLifeMs: number;
  maxStepPerFrame: number;
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

export function getAdaptiveAltitudeMotorOptions({
  current,
  target,
  deltaMs,
  snapDistance = DEFAULT_SNAP_DISTANCE,
  settleDurationMs = DEFAULT_SETTLE_DURATION_MS,
  baseHalfLifeMs = DEFAULT_HALF_LIFE_MS,
  baseMaxStepPerFrame = DEFAULT_MAX_STEP_PER_FRAME,
}: AdaptiveAltitudeMotorOptions): AdaptiveAltitudeMotorProfile {
  const distance = Math.abs(target - current);

  if (distance <= snapDistance || deltaMs <= 0) {
    return {
      halfLifeMs: baseHalfLifeMs,
      maxStepPerFrame: baseMaxStepPerFrame,
    };
  }

  const normalizedSnapDistance = Math.max(snapDistance, 0.2);
  const logDistance = Math.max(1, Math.log2(distance / normalizedSnapDistance));
  const halfLifeMs = Math.max(
    MIN_ADAPTIVE_HALF_LIFE_MS,
    Math.min(baseHalfLifeMs, settleDurationMs / logDistance),
  );
  const maxStepPerFrame = Math.max(
    baseMaxStepPerFrame,
    distance * (deltaMs / Math.max(settleDurationMs, deltaMs)) * 1.4,
  );

  return {
    halfLifeMs,
    maxStepPerFrame,
  };
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