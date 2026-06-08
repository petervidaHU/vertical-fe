import { describe, expect, it } from "@jest/globals";
import { clampAltitude, getAdaptiveAltitudeMotorOptions, smoothToward, stepAltitudeMotor } from "./altitudeMotor";

describe("altitudeMotor", () => {
  it("clamps altitude to configured bounds", () => {
    expect(clampAltitude(-10, 0, 500)).toBe(0);
    expect(clampAltitude(600, 0, 500)).toBe(500);
    expect(clampAltitude(250, 0, 500)).toBe(250);
  });

  it("smooths toward the target without overshooting", () => {
    const next = smoothToward(0, 100, 90, 16.66);

    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(100);
  });

  it("caps the maximum per-frame step and clamps the target", () => {
    const next = stepAltitudeMotor({
      current: 0,
      target: 1200,
      deltaMs: 1000,
      maxAltitude: 800,
      maxStepPerFrame: 300,
    });

    expect(next).toBe(300);
  });

  it("uses a faster motor profile for larger jumps", () => {
    const shortJump = getAdaptiveAltitudeMotorOptions({
      current: 0,
      target: 100,
      deltaMs: 16.66,
    });
    const longJump = getAdaptiveAltitudeMotorOptions({
      current: 0,
      target: 10000,
      deltaMs: 16.66,
    });

    expect(longJump.halfLifeMs).toBeLessThan(shortJump.halfLifeMs);
    expect(longJump.maxStepPerFrame).toBeGreaterThan(shortJump.maxStepPerFrame);
  });

  it("keeps short and long jumps in a similar real-time settling window", () => {
    const deltaMs = 16.66;
    const runForDuration = (target: number, durationMs: number) => {
      let current = 0;
      const frameCount = Math.ceil(durationMs / deltaMs);

      for (let index = 0; index < frameCount; index += 1) {
        const adaptiveOptions = getAdaptiveAltitudeMotorOptions({
          current,
          target,
          deltaMs,
        });

        current = stepAltitudeMotor({
          current,
          target,
          deltaMs,
          ...adaptiveOptions,
        });
      }

      return current;
    };

    expect(runForDuration(100, 600)).toBeGreaterThan(95);
    expect(runForDuration(10000, 600)).toBeGreaterThan(9500);
  });
});