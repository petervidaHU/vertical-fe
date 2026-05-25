import { describe, expect, it } from "@jest/globals";
import {
  parseStoryExtraContent,
  parseStoryForm,
  parseStoryUpdateForm,
  STORY_EXTRA_CONTENT_MAX_LENGTH,
} from "./storySchemas";

describe("story schema parsing", () => {
  it("parses and normalizes story form payload", () => {
    const formData = new FormData();
    formData.set("title", "  Story A  ");
    formData.set("epicTitle", "  Epic A  ");
    formData.set("extraContent", "  Hello\r\nWorld  ");

    expect(parseStoryForm(formData)).toEqual({
      title: "Story A",
      epicTitle: "Epic A",
      extraContent: "Hello\nWorld",
    });
  });

  it("normalizes empty epic title to undefined", () => {
    const formData = new FormData();
    formData.set("title", "Story B");
    formData.set("epicTitle", "   ");

    expect(parseStoryForm(formData).epicTitle).toBeUndefined();
  });

  it("throws when title is missing", () => {
    const formData = new FormData();
    formData.set("title", "  ");

    expect(() => parseStoryForm(formData)).toThrow();
  });

  it("throws when extra content is too long", () => {
    const formData = new FormData();
    formData.set("title", "Story");
    formData.set("extraContent", "x".repeat(STORY_EXTRA_CONTENT_MAX_LENGTH + 1));

    expect(() => parseStoryForm(formData)).toThrow();
  });

  it("parses update payload including id", () => {
    const formData = new FormData();
    formData.set("title", "Updated Story");

    expect(parseStoryUpdateForm(formData, "story-id")).toEqual({
      id: "story-id",
      title: "Updated Story",
      epicTitle: undefined,
      extraContent: "",
    });
  });

  it("parses extra content helper directly", () => {
    const formData = new FormData();
    formData.set("extraContent", "  content\r\n");

    expect(parseStoryExtraContent(formData)).toBe("content");
  });
});
