import { describe, expect, it } from "@jest/globals";
import {
  localizeAltitudeInfo,
  localizeEpic,
  localizeJourney,
  localizeStory,
  localizeTag,
} from "./localizeContent";

describe("localizeContent", () => {
  describe("localizeEpic", () => {
    const epic = {
      id: "e1",
      title: "Stratosphere",
      description: "The second layer.",
      color: "#fff",
      translations: [{ locale: "hu", title: "Sztratoszféra", description: "A második réteg." }],
    };

    it("returns base text for the default locale and strips translations", () => {
      const result = localizeEpic(epic, "en");
      expect(result).not.toHaveProperty("translations");
      expect(result.title).toBe("Stratosphere");
      expect(result.description).toBe("The second layer.");
      expect(result.color).toBe("#fff");
    });

    it("returns the translated text for a non-default locale", () => {
      const result = localizeEpic(epic, "hu");
      expect(result.title).toBe("Sztratoszféra");
      expect(result.description).toBe("A második réteg.");
    });

    it("falls back to base text when the translation row is missing", () => {
      const result = localizeEpic({ ...epic, translations: [] }, "hu");
      expect(result.title).toBe("Stratosphere");
    });

    it("falls back to base text when a translated field is blank", () => {
      const result = localizeEpic(
        { ...epic, translations: [{ locale: "hu", title: "  ", description: "A második réteg." }] },
        "hu",
      );
      expect(result.title).toBe("Stratosphere");
      expect(result.description).toBe("A második réteg.");
    });
  });

  describe("localizeStory", () => {
    const story = {
      id: "s1",
      title: "Birds",
      description: "They fly.",
      extraContent: "<p>More</p>",
      lineLabel: "Bird line",
      tooltipText: "Tip",
      translations: [
        {
          locale: "hu",
          title: "Madarak",
          description: "Repülnek.",
          extraContent: "",
          lineLabel: "",
          tooltipText: "Tipp",
        },
      ],
    };

    it("resolves each translatable field independently with fallback", () => {
      const result = localizeStory(story, "hu");
      expect(result.title).toBe("Madarak");
      expect(result.description).toBe("Repülnek.");
      expect(result.extraContent).toBe("<p>More</p>"); // blank → fallback
      expect(result.lineLabel).toBe("Bird line"); // blank → fallback
      expect(result.tooltipText).toBe("Tipp");
    });
  });

  describe("localizeAltitudeInfo", () => {
    const altitudeInfo = {
      id: "a1",
      title: "Temperature",
      values: [
        {
          id: "v1",
          value: "cold",
          startPoint: 0,
          endPoint: 100,
          translations: [{ locale: "hu", value: "hideg" }],
        },
      ],
      translations: [{ locale: "hu", title: "Hőmérséklet" }],
    };

    it("localizes the title and nested values", () => {
      const result = localizeAltitudeInfo(altitudeInfo, "hu");
      expect(result.title).toBe("Hőmérséklet");
      expect(result.values[0].value).toBe("hideg");
      expect(result.values[0]).not.toHaveProperty("translations");
    });

    it("keeps base values for the default locale", () => {
      const result = localizeAltitudeInfo(altitudeInfo, "en");
      expect(result.title).toBe("Temperature");
      expect(result.values[0].value).toBe("cold");
    });
  });

  describe("localizeTag", () => {
    it("localizes the tag display name", () => {
      const tag = { id: "t1", name: "nature", translations: [{ locale: "hu", name: "természet" }] };
      expect(localizeTag(tag, "hu").name).toBe("természet");
      expect(localizeTag(tag, "en").name).toBe("nature");
    });
  });

  describe("localizeJourney", () => {
    it("localizes the journey name", () => {
      const journey = {
        id: "j1",
        name: "Up",
        startingPoint: '{"mode":"color","color":"#4b3726"}',
        translations: [{ locale: "hu", name: "Fel" }],
      };
      const result = localizeJourney(journey, "hu");
      expect(result.name).toBe("Fel");
      // startingPoint is a background config, not translatable — passes through untouched.
      expect(result.startingPoint).toBe('{"mode":"color","color":"#4b3726"}');
    });
  });
});
