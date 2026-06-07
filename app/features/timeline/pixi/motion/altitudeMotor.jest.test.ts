import { describe, expect, it } from "@jest/globals";
import { clampAltitude, smoothToward, stepAltitudeMotor } from "./altitudeMotor";

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
});