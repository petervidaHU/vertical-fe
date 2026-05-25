import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render } from "@testing-library/react";
import React from "react";
import { useWheelAltitude } from "./useWheelAltitude";

type HookProps = {
  pace: number;
  scaledValue: number;
  naturalValue: number;
  minValue?: number;
  enabled?: boolean;
  target: HTMLElement;
  onChange: ReturnType<typeof jest.fn>;
};

const HookHarness = ({
  pace,
  scaledValue,
  naturalValue,
  minValue,
  enabled,
  target,
  onChange,
}: HookProps) => {
  useWheelAltitude({
    pace,
    scaledValue,
    naturalValue,
    minValue,
    enabled,
    target,
    onChange,
  });

  return null;
};

describe("useWheelAltitude", () => {
  it("computes next scaled and natural altitude", () => {
    const target = document.createElement("div");
    const onChange = jest.fn();

    render(
      <HookHarness
        pace={0.5}
        scaledValue={20}
        naturalValue={200}
        target={target}
        onChange={onChange}
      />,
    );

    fireEvent.wheel(target, { deltaY: -20 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({
      deltaY: 20,
      nextScaled: 30,
      nextNatural: 220,
    });
  });

  it("respects minimum clamp", () => {
    const target = document.createElement("div");
    const onChange = jest.fn();

    render(
      <HookHarness
        pace={1}
        scaledValue={2}
        naturalValue={2}
        minValue={0}
        target={target}
        onChange={onChange}
      />,
    );

    fireEvent.wheel(target, { deltaY: 10 });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({
      nextScaled: 0,
      nextNatural: 0,
    });
  });

  it("does nothing when disabled", () => {
    const target = document.createElement("div");
    const onChange = jest.fn();

    render(
      <HookHarness
        pace={1}
        scaledValue={0}
        naturalValue={0}
        enabled={false}
        target={target}
        onChange={onChange}
      />,
    );

    fireEvent.wheel(target, { deltaY: -20 });

    expect(onChange).not.toHaveBeenCalled();
  });
});
