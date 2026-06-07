import { describe, expect, it } from "@jest/globals";
import { normalizeImportPayload } from "./importPayload";

describe("normalizeImportPayload", () => {
  it("normalizes, deduplicates, and keeps valid tags on imported stories and altitude info", () => {
    const parsed = normalizeImportPayload({
      altitudeInfos: [
        {
          title: "Temperature",
          tags: [" Climate ", "climate", "ab", "science"],
          values: [{ value: "18 C", startPoint: 0, endPoint: 120 }],
        },
      ],
      epics: [{ title: "Approach", startPoint: 0, endPoint: 120 }],
      stories: [
        {
          title: "Set Camp",
          startPoint: 10,
          endPoint: 40,
          tags: [" Planning ", "planning", "", "basics"],
        },
      ],
    });

    expect(parsed.altitudeInfos[0]?.tags).toEqual(["climate", "science"]);
    expect(parsed.stories[0]?.tags).toEqual(["planning", "basics"]);
  });

  it("caps imported tags to the configured system maximum", () => {
    const tags = Array.from({ length: 25 }, (_, index) => `topic-${String(index).padStart(2, "0")}`);

    const parsed = normalizeImportPayload({
      altitudeInfos: [
        {
          title: "Oxygen",
          values: [{ value: "7 mol", startPoint: 0, endPoint: 10 }],
        },
      ],
      stories: [
        {
          title: "High Camp",
          startPoint: 1,
          endPoint: 2,
          tags,
        },
      ],
    });

    expect(parsed.stories[0]?.tags).toHaveLength(20);
    expect(parsed.stories[0]?.tags[0]).toBe("topic-00");
    expect(parsed.stories[0]?.tags[19]).toBe("topic-19");
  });
});