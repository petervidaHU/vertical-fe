import { describe, expect, it } from "@jest/globals";
import { buildStableCardColumnAssignments } from "./cardColumns";

describe("buildStableCardColumnAssignments", () => {
  it("keeps non-overlapping stories in the same column", () => {
    const assignments = buildStableCardColumnAssignments(
      [
        { id: "first", startPoint: 0, endPoint: 100 },
        { id: "second", startPoint: 3000, endPoint: 3200 },
      ],
      1400,
      { cardWidth: 320, leftInset: 86, rightInset: 264 },
    );

    expect(assignments.get("first")).toBe(0);
    expect(assignments.get("second")).toBe(0);
  });

  it("assigns overlapping stories to distinct stable columns when space allows", () => {
    const assignments = buildStableCardColumnAssignments(
      [
        { id: "first", startPoint: 0, endPoint: 1200 },
        { id: "second", startPoint: 100, endPoint: 800 },
        { id: "third", startPoint: 200, endPoint: 900 },
      ],
      1600,
      { cardWidth: 320, leftInset: 86, rightInset: 264 },
    );

    expect(assignments.get("first")).toBe(0);
    expect(assignments.get("second")).toBe(1);
    expect(assignments.get("third")).toBe(2);
  });

  it("reuses stable columns deterministically when overlap exceeds available columns", () => {
    const assignments = buildStableCardColumnAssignments(
      [
        { id: "first", startPoint: 0, endPoint: 1400 },
        { id: "second", startPoint: 50, endPoint: 1300 },
        { id: "third", startPoint: 100, endPoint: 1200 },
      ],
      1150,
      { cardWidth: 320, leftInset: 86, rightInset: 264 },
    );

    expect(assignments.get("first")).toBe(0);
    expect(assignments.get("second")).toBe(1);
    expect(assignments.get("third")).toBe(1);
  });
});