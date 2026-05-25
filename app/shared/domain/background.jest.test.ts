import { describe, expect, it } from "@jest/globals";
import {
  backgroundToCss,
  defaultColorBackground,
  getDefaultGradientFromColor,
  isHexColor,
  parseStoredBackground,
  primaryColorFromBackground,
  serializeBackground,
  tryParseBackgroundInput,
} from "./background";

describe("background domain", () => {
  it("validates hex colors", () => {
    expect(isHexColor("#abc")).toBe(true);
    expect(isHexColor("#A1B2C3")).toBe(true);
    expect(isHexColor("blue")).toBe(false);
  });

  it("falls back to default color when invalid", () => {
    expect(defaultColorBackground("bad")).toEqual({ mode: "color", color: "#4ecdc4" });
  });

  it("builds deterministic gradient css", () => {
    const css = backgroundToCss({
      mode: "gradient",
      stops: [
        { color: "#000000", percentage: 100 },
        { color: "#ffffff", percentage: 0 },
      ],
    });

    expect(css).toBe("linear-gradient(90deg, #ffffff 0%, #000000 100%)");
  });

  it("parses color and gradient inputs", () => {
    const color = tryParseBackgroundInput("#4ecdc4");
    expect(color.background).toEqual({ mode: "color", color: "#4ecdc4" });

    const gradient = tryParseBackgroundInput(
      JSON.stringify({
        mode: "gradient",
        stops: [
          { color: "#123456", percentage: 30 },
          { color: "#abcdef", percentage: 80 },
        ],
      }),
    );

    expect(gradient.background).toBeDefined();
    expect(gradient.error).toBeUndefined();
  });

  it("serializes and restores stored backgrounds", () => {
    const serialized = serializeBackground(getDefaultGradientFromColor("#ffaa00"));
    const parsed = parseStoredBackground(serialized, "#000000");

    expect(parsed.mode).toBe("gradient");
    expect(primaryColorFromBackground(parsed)).toBe("#ffaa00");
  });

  it("returns fallback when stored background is invalid", () => {
    const parsed = parseStoredBackground("{bad json}", "#111111");
    expect(parsed).toEqual({ mode: "color", color: "#111111" });
  });
});
