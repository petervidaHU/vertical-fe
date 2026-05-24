import { describe, expect, it } from "vitest";
import { parseStoryForm, parseStoryUpdateForm, STORY_EXTRA_CONTENT_MAX_LENGTH } from "./storySchemas";

describe("story schemas", () => {
  it("parses create form values", () => {
    const formData = new FormData();
    formData.set("title", "  Story A  ");
    formData.set("epicTitle", "  Epic A  ");

    expect(parseStoryForm(formData)).toEqual({
      title: "Story A",
      epicTitle: "Epic A",
      extraContent: "",
    });
  });

  it("converts empty epicTitle to undefined", () => {
    const formData = new FormData();
    formData.set("title", "Story B");
    formData.set("epicTitle", "   ");

    expect(parseStoryForm(formData)).toEqual({
      title: "Story B",
      epicTitle: undefined,
      extraContent: "",
    });
  });

  it("normalizes bounded extra content", () => {
    const formData = new FormData();
    formData.set("title", "Story B");
    formData.set("extraContent", "  # Heading\r\n\r\nBody text  ");

    expect(parseStoryForm(formData)).toEqual({
      title: "Story B",
      epicTitle: undefined,
      extraContent: "# Heading\n\nBody text",
    });
  });

  it("throws when extra content exceeds limit", () => {
    const formData = new FormData();
    formData.set("title", "Story B");
    formData.set("extraContent", "x".repeat(STORY_EXTRA_CONTENT_MAX_LENGTH + 1));

    expect(() => parseStoryForm(formData)).toThrowError();
  });

  it("throws on missing title", () => {
    const formData = new FormData();
    formData.set("title", "   ");

    expect(() => parseStoryForm(formData)).toThrowError();
  });

  it("parses update form with id", () => {
    const formData = new FormData();
    formData.set("title", "Story C");
    formData.set("epicTitle", "Epic C");

    expect(parseStoryUpdateForm(formData, "42")).toEqual({
      id: "42",
      title: "Story C",
      epicTitle: "Epic C",
      extraContent: "",
    });
  });

  it("throws on missing update id", () => {
    const formData = new FormData();
    formData.set("title", "Story D");

    expect(() => parseStoryUpdateForm(formData, undefined)).toThrowError();
  });
});
