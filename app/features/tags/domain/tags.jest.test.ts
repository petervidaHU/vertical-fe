/// <reference types="jest" />

import {
  validateTagName,
  validateTagCount,
  normalizeTagName,
  isTagNameDuplicate,
  filterByTags,
  filterOutByExcludedTags,
  countTagsPerItem,
  TAG_NAME_MIN_LENGTH,
  TAG_NAME_MAX_LENGTH,
  TAG_SYSTEM_MAX_COUNT,
} from "./tags";
import type { TagLike, TaggableItem } from "./tags";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTag(overrides: Partial<TagLike> = {}): TagLike {
  return { id: "t1", name: "example", ...overrides };
}

function makeItem(overrides: Partial<TaggableItem> & { tags?: TagLike[] } = {}): TaggableItem & { tags: TagLike[] } {
  return { tags: [], ...overrides };
}

// ── validateTagName ──────────────────────────────────────────────────────────

describe("validateTagName", () => {
  it("accepts a valid tag name", () => {
    expect(validateTagName("history").valid).toBe(true);
  });

  it("accepts a 3-character name", () => {
    expect(validateTagName("abc").valid).toBe(true);
  });

  it("accepts a 100-character name", () => {
    const longName = "a".repeat(TAG_NAME_MAX_LENGTH);
    expect(validateTagName(longName).valid).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = validateTagName("");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects a whitespace-only name", () => {
    const result = validateTagName("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("empty");
  });

  it("rejects a name shorter than minimum", () => {
    const shortName = "a".repeat(TAG_NAME_MIN_LENGTH - 1);
    const result = validateTagName(shortName);
    expect(result.valid).toBe(false);
  });

  it("rejects a name longer than maximum", () => {
    const longName = "a".repeat(TAG_NAME_MAX_LENGTH + 1);
    const result = validateTagName(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(String(TAG_NAME_MAX_LENGTH));
  });

  it("trims whitespace before validating", () => {
    expect(validateTagName("  hello  ").valid).toBe(true);
  });
});

// ── validateTagCount ─────────────────────────────────────────────────────────

describe("validateTagCount", () => {
  it("accepts when under the limit", () => {
    const result = validateTagCount(5, 3);
    expect(result.valid).toBe(true);
  });

  it("accepts exactly at the limit", () => {
    const result = validateTagCount(TAG_SYSTEM_MAX_COUNT - 3, 3);
    expect(result.valid).toBe(true);
  });

  it("rejects when over the limit", () => {
    const result = validateTagCount(TAG_SYSTEM_MAX_COUNT, 1);
    expect(result.valid).toBe(false);
  });

  it("rejects adding many tags at once over the limit", () => {
    const result = validateTagCount(18, 5);
    expect(result.valid).toBe(false);
  });
});

// ── normalizeTagName ─────────────────────────────────────────────────────────

describe("normalizeTagName", () => {
  it("trims whitespace", () => {
    expect(normalizeTagName("  Hello  ")).toBe("hello");
  });

  it("lowercases the name", () => {
    expect(normalizeTagName("HISTORY")).toBe("history");
  });

  it("handles mixed case and whitespace", () => {
    expect(normalizeTagName("  Biology  ")).toBe("biology");
  });
});

// ── isTagNameDuplicate ───────────────────────────────────────────────────────

describe("isTagNameDuplicate", () => {
  it("detects exact match", () => {
    expect(isTagNameDuplicate("history", ["history", "biology"])).toBe(true);
  });

  it("detects case-insensitive match", () => {
    expect(isTagNameDuplicate("History", ["history", "biology"])).toBe(true);
  });

  it("returns false for non-matching name", () => {
    expect(isTagNameDuplicate("geography", ["history", "biology"])).toBe(false);
  });

  it("returns false for empty existing list", () => {
    expect(isTagNameDuplicate("history", [])).toBe(false);
  });

  it("trims and lowercases for comparison", () => {
    expect(isTagNameDuplicate("  HISTORY  ", ["history"])).toBe(true);
  });
});

// ── filterByTags ─────────────────────────────────────────────────────────────

describe("filterByTags", () => {
  const tagA = makeTag({ id: "a", name: "history" });
  const tagB = makeTag({ id: "b", name: "biology" });
  const tagC = makeTag({ id: "c", name: "geography" });

  const items = [
    makeItem({ tags: [tagA] }),
    makeItem({ tags: [tagB] }),
    makeItem({ tags: [tagA, tagB] }),
    makeItem({ tags: [tagC] }),
    makeItem({ tags: [] }),
    makeItem({ tags: undefined as unknown as TagLike[] }),
  ];

  it("returns all items when no tags are enabled", () => {
    const result = filterByTags(items, []);
    expect(result).toHaveLength(6);
  });

  it("filters with OR logic: item with tagA", () => {
    const result = filterByTags(items, ["a"]);
    expect(result).toHaveLength(2); // items[0] and items[2]
  });

  it("filters with OR logic: items with tagA OR tagB", () => {
    const result = filterByTags(items, ["a", "b"]);
    expect(result).toHaveLength(3); // items[0], items[1], items[2]
  });

  it("returns empty array when no items match", () => {
    const result = filterByTags(items, ["nonexistent"]);
    expect(result).toHaveLength(0);
  });

  it("handles items with no tags (undefined tags)", () => {
    const noTagItems = [makeItem({ tags: undefined as unknown as TagLike[] })];
    const result = filterByTags(noTagItems, ["a"]);
    expect(result).toHaveLength(0);
  });

  it("handles items with null tags", () => {
    const nullTagItems = [makeItem({ tags: null as unknown as TagLike[] })];
    const result = filterByTags(nullTagItems, ["a"]);
    expect(result).toHaveLength(0);
  });

  it("returns items when all enabled tags are present", () => {
    const result = filterByTags(items, ["c"]);
    expect(result).toHaveLength(1); // items[3]
  });
});

// ── filterOutByExcludedTags ──────────────────────────────────────────────────

describe("filterOutByExcludedTags", () => {
  const tagA = makeTag({ id: "a", name: "history" });
  const tagB = makeTag({ id: "b", name: "biology" });
  const tagC = makeTag({ id: "c", name: "geography" });

  const items = [
    makeItem({ tags: [tagA] }),
    makeItem({ tags: [tagB] }),
    makeItem({ tags: [tagA, tagB] }),
    makeItem({ tags: [tagC] }),
    makeItem({ tags: [] }),
    makeItem({ tags: undefined as unknown as TagLike[] }),
  ];

  const allTagIds = ["a", "b", "c"];

  it("returns all items when all tags are enabled (default)", () => {
    const result = filterOutByExcludedTags(items, allTagIds, allTagIds);
    expect(result).toHaveLength(6);
  });

  it("returns all items when no tags exist in the system", () => {
    const result = filterOutByExcludedTags(items, allTagIds, []);
    expect(result).toHaveLength(6);
  });

  it("hides items that carry an excluded tag (opt-out)", () => {
    // Only tagB excluded → items[1] (tagB only) and items[2] (tagA+tagB) should be hidden
    const result = filterOutByExcludedTags(items, ["a", "c"], allTagIds);
    expect(result).toHaveLength(4);
    expect(result).not.toContain(items[1]); // tagB only
    expect(result).not.toContain(items[2]); // tagA + tagB
  });

  it("hides items when multiple tags are excluded", () => {
    // tagA and tagB excluded → items[0] (tagA), items[1] (tagB), items[2] (tagA+tagB) hidden
    const result = filterOutByExcludedTags(items, ["c"], allTagIds);
    expect(result).toHaveLength(3);
    expect(result).toContain(items[3]); // tagC only
    expect(result).toContain(items[4]); // no tags
    expect(result).toContain(items[5]); // undefined tags
  });

  it("always shows untagged items regardless of exclusions", () => {
    const result = filterOutByExcludedTags(items, [], allTagIds);
    expect(result).toHaveLength(2); // only the untagged items
    expect(result).toContain(items[4]);
    expect(result).toContain(items[5]);
  });

  it("shows everything when no tag system exists", () => {
    const result = filterOutByExcludedTags(items, [], []);
    expect(result).toHaveLength(6);
  });

  it("handles items with null tags", () => {
    const nullTagItems = [makeItem({ tags: null as unknown as TagLike[] })];
    const result = filterOutByExcludedTags(nullTagItems, ["a"], allTagIds);
    expect(result).toHaveLength(1);
  });
});

// ── countTagsPerItem ─────────────────────────────────────────────────────────

describe("countTagsPerItem", () => {
  const tagA = makeTag({ id: "a", name: "history" });
  const tagB = makeTag({ id: "b", name: "biology" });
  const allTags = [tagA, tagB];

  it("counts zero for unused tags", () => {
    const items = [makeItem({ tags: [] })];
    const counts = countTagsPerItem(items, allTags);
    expect(counts.get("a")).toBe(0);
    expect(counts.get("b")).toBe(0);
  });

  it("counts tags correctly", () => {
    const items = [
      makeItem({ tags: [tagA] }),
      makeItem({ tags: [tagA, tagB] }),
      makeItem({ tags: [tagB] }),
    ];
    const counts = countTagsPerItem(items, allTags);
    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(2);
  });

  it("initializes all tag ids even if unused", () => {
    const items: TaggableItem[] = [];
    const counts = countTagsPerItem(items, allTags);
    expect(counts.has("a")).toBe(true);
    expect(counts.has("b")).toBe(true);
  });
});
