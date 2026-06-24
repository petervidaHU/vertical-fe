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

  it("parses per-locale translation blocks and drops the source/blank locales", () => {
    const parsed = normalizeImportPayload({
      altitudeInfos: [
        {
          title: "Temperature",
          translations: { hu: { title: "Hőmérséklet" }, en: { title: "ignored-source" } },
          values: [
            {
              value: "18 C",
              startPoint: 0,
              endPoint: 120,
              translations: { hu: { value: "18 °C hideg" } },
            },
          ],
        },
      ],
      epics: [
        {
          title: "Approach",
          startPoint: 0,
          endPoint: 120,
          translations: { hu: { title: "Megközelítés", description: "Leírás" } },
        },
      ],
      stories: [
        {
          title: "Set Camp",
          startPoint: 10,
          endPoint: 40,
          translations: { hu: { title: "Tábor", description: "" } },
        },
      ],
    });

    // The "en" block is ignored (source locale lives in the base columns).
    expect(parsed.altitudeInfos[0]?.translations).toEqual([{ locale: "hu", title: "Hőmérséklet" }]);
    expect(parsed.altitudeInfos[0]?.values[0]?.translations).toEqual([{ locale: "hu", value: "18 °C hideg" }]);
    expect(parsed.epics[0]?.translations).toEqual([
      { locale: "hu", title: "Megközelítés", description: "Leírás" },
    ]);
    // Blank description still produces a row because the title carries content.
    expect(parsed.stories[0]?.translations).toEqual([
      { locale: "hu", title: "Tábor", description: "", extraContent: "", lineLabel: "", tooltipText: "" },
    ]);
  });

  it("defaults missing translation blocks to an empty array", () => {
    const parsed = normalizeImportPayload({
      epics: [{ title: "Approach", startPoint: 0, endPoint: 120 }],
    });

    expect(parsed.epics[0]?.translations).toEqual([]);
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