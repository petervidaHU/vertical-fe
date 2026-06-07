import { describe, expect, it } from "@jest/globals";
import {
  DEFAULT_SCROLL_MULTIPLIER,
  formatScrollMultiplierValue,
  normalizeScrollMultiplier,
  stepScrollMultiplier,
} from "./scrollMultiplier";

describe("scrollMultiplier", () => {
  it("starts at the base 100 meter step", () => {
    expect(DEFAULT_SCROLL_MULTIPLIER).toBe(1);
    expect(formatScrollMultiplierValue(DEFAULT_SCROLL_MULTIPLIER)).toBe("100 m");
  });

  it("steps through powers of ten and clamps at the edges", () => {
    expect(stepScrollMultiplier(1, 1)).toBe(10);
    expect(stepScrollMultiplier(10, 1)).toBe(100);
    expect(stepScrollMultiplier(100, 1)).toBe(1000);
    expect(stepScrollMultiplier(1000, 1)).toBe(1000);
    expect(stepScrollMultiplier(1000, -1)).toBe(100);
    expect(stepScrollMultiplier(1, -1)).toBe(1);
  });

  it("formats larger steps as kilometers", () => {
    expect(formatScrollMultiplierValue(10)).toBe("1 km");
    expect(formatScrollMultiplierValue(100)).toBe("10 km");
    expect(formatScrollMultiplierValue(1000)).toBe("100 km");
  });

  it("normalizes unsupported values to the nearest supported step", () => {
    expect(normalizeScrollMultiplier(7)).toBe(10);
    expect(normalizeScrollMultiplier(80)).toBe(100);
  });
});