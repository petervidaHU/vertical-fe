import { describe, expect, it } from "@jest/globals";
import { calculateGradientValue, getActiveAltitudeInfoItems, resolveAltitudeInfoIconSymbol } from "./altitudeInfo";

describe("altitudeInfo", () => {
  it("returns only currently active values sorted by series order", () => {
    const items = getActiveAltitudeInfoItems([
      {
        id: "temperature",
        title: "Temperature",
        icon: "thermometer",
        order: 20,
        values: [
          { id: "temp-low", value: "18 C", startPoint: 0, endPoint: 99, useGradient: false, startValue: null, endValue: null },
          { id: "temp-high", value: "12 C", startPoint: 100, endPoint: 180, useGradient: false, startValue: null, endValue: null },
        ],
      },
      {
        id: "oxygen",
        title: "Oxygen density of the air",
        icon: "oxygen",
        order: 10,
        values: [
          { id: "oxy-main", value: "7.2 mol/m3", startPoint: 80, endPoint: 160, useGradient: false, startValue: null, endValue: null },
        ],
      },
      {
        id: "humidity",
        title: "Humidity",
        icon: "droplet",
        order: 30,
        values: [
          { id: "humidity-gap", value: "52%", startPoint: 181, endPoint: 220, useGradient: false, startValue: null, endValue: null },
        ],
      },
    ], 120);

    expect(items).toEqual([
      {
        id: "oxygen",
        title: "Oxygen density of the air",
        icon: "oxygen",
        order: 10,
        value: "7.2 mol/m3",
        valueId: "oxy-main",
      },
      {
        id: "temperature",
        title: "Temperature",
        icon: "thermometer",
        order: 20,
        value: "12 C",
        valueId: "temp-high",
      },
    ]);
  });

  it("calculates gradient values when useGradient is true", () => {
    const items = getActiveAltitudeInfoItems([
      {
        id: "altitude-pressure",
        title: "Altitude Pressure",
        icon: "gauge",
        order: 10,
        values: [
          {
            id: "pressure-gradient",
            value: "unused",
            startPoint: 2000,
            endPoint: 5000,
            useGradient: true,
            startValue: 1,
            endValue: 10,
          },
        ],
      },
    ], 3500);

    expect(items).toHaveLength(1);
    expect(items[0].value).toBe("5.50");
  });

  it("calculates gradient values at the start of the range", () => {
    const items = getActiveAltitudeInfoItems([
      {
        id: "altitude-pressure",
        title: "Altitude Pressure",
        icon: "gauge",
        order: 10,
        values: [
          {
            id: "pressure-gradient",
            value: "unused",
            startPoint: 2000,
            endPoint: 5000,
            useGradient: true,
            startValue: 1,
            endValue: 10,
          },
        ],
      },
    ], 2000);

    expect(items).toHaveLength(1);
    expect(items[0].value).toBe("1.00");
  });

  it("calculates gradient values at the end of the range", () => {
    const items = getActiveAltitudeInfoItems([
      {
        id: "altitude-pressure",
        title: "Altitude Pressure",
        icon: "gauge",
        order: 10,
        values: [
          {
            id: "pressure-gradient",
            value: "unused",
            startPoint: 2000,
            endPoint: 5000,
            useGradient: true,
            startValue: 1,
            endValue: 10,
          },
        ],
      },
    ], 5000);

    expect(items).toHaveLength(1);
    expect(items[0].value).toBe("10.00");
  });

  it("falls back to the info icon when the input icon is unknown", () => {
    expect(resolveAltitudeInfoIconSymbol("unknown-key")).toBe("i");
  });

  describe("calculateGradientValue", () => {
    it("calculates correct value at midpoint", () => {
      const value = calculateGradientValue(3500, 2000, 5000, 1, 10);
      expect(value).toBe(5.5);
    });

    it("returns start value at start point", () => {
      const value = calculateGradientValue(2000, 2000, 5000, 1, 10);
      expect(value).toBe(1);
    });

    it("returns end value at end point", () => {
      const value = calculateGradientValue(5000, 2000, 5000, 1, 10);
      expect(value).toBe(10);
    });

    it("calculates with negative gradient", () => {
      const value = calculateGradientValue(3500, 2000, 5000, 10, 1);
      expect(value).toBe(5.5);
    });

    it("handles zero-width range", () => {
      const value = calculateGradientValue(2000, 2000, 2000, 1, 10);
      expect(value).toBe(1);
    });
  });
});