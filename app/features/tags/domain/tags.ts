// ── Tag domain types ────────────────────────────────────────────────────────

export type TagLike = {
  id: string;
  name: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

export const TAG_NAME_MIN_LENGTH = 3;
export const TAG_NAME_MAX_LENGTH = 100;
export const TAG_SYSTEM_MAX_COUNT = 20;

// ── Validation ───────────────────────────────────────────────────────────────

export type TagValidationResult = {
  valid: boolean;
  error?: string;
};

/**
 * Validates a single tag name against constraints:
 * - 3-100 characters
 * - Non-empty after trimming
 */
export function validateTagName(name: string): TagValidationResult {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: "Tag name must not be empty." };
  }

  if (trimmed.length < TAG_NAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Tag name must be at least ${TAG_NAME_MIN_LENGTH} characters.`,
    };
  }

  if (trimmed.length > TAG_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Tag name must be at most ${TAG_NAME_MAX_LENGTH} characters.`,
    };
  }

  return { valid: true };
}

/**
 * Checks whether adding new tags would exceed the system-wide limit.
 */
export function validateTagCount(
  currentCount: number,
  newTagCount: number,
): TagValidationResult {
  const total = currentCount + newTagCount;

  if (total > TAG_SYSTEM_MAX_COUNT) {
    return {
      valid: false,
      error: `Cannot create more than ${TAG_SYSTEM_MAX_COUNT} unique tags. Currently at ${currentCount}.`,
    };
  }

  return { valid: true };
}

/**
 * Normalize a tag name for comparison and storage.
 * Trims whitespace and lowercases.
 */
export function normalizeTagName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Checks whether a tag name collides with an existing tag name (case-insensitive).
 */
export function isTagNameDuplicate(
  name: string,
  existingNames: string[],
): boolean {
  const normalized = normalizeTagName(name);
  return existingNames.some(
    (existing) => normalizeTagName(existing) === normalized,
  );
}

// ── Filtering ────────────────────────────────────────────────────────────────

export type TaggableItem = {
  tags?: TagLike[] | null;
};

/**
 * OR-based tag filtering: an item passes if it has ANY of the enabled tag IDs.
 */
export function filterByTags<T extends TaggableItem>(
  items: T[],
  enabledTagIds: string[],
): T[] {
  if (enabledTagIds.length === 0) {
    return items;
  }

  const enabledSet = new Set(enabledTagIds);

  return items.filter((item) => {
    const itemTags = item.tags ?? [];
    return itemTags.some((tag) => enabledSet.has(tag.id));
  });
}

/**
 * Exclusion-based tag filtering: an item passes UNLESS it carries any tag
 * that is NOT in the enabled set.  Untagged items always pass.
 *
 * This implements "opt-out" semantics:
 *   - All tags selected by default (show everything)
 *   - Deselecting a tag hides items that have that tag
 */
export function filterOutByExcludedTags<T extends TaggableItem>(
  items: T[],
  enabledTagIds: string[],
  allTagIds: string[],
): T[] {
  if (allTagIds.length === 0) {
    return items;
  }

  // All tags enabled → nothing excluded
  if (enabledTagIds.length === allTagIds.length) {
    return items;
  }

  const enabledSet = new Set(enabledTagIds);
  const excludedIds = allTagIds.filter((id) => !enabledSet.has(id));
  const excludedSet = new Set(excludedIds);

  return items.filter((item) => {
    const itemTags = item.tags ?? [];
    // Exclude item if it has any excluded (deselected) tag
    return !itemTags.some((tag) => excludedSet.has(tag.id));
  });
}

/**
 * Collect counts for each tag: how many items have that tag.
 */
export function countTagsPerItem<T extends TaggableItem>(
  items: T[],
  allTags: TagLike[],
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const tag of allTags) {
    counts.set(tag.id, 0);
  }

  for (const item of items) {
    const itemTags = item.tags ?? [];
    for (const tag of itemTags) {
      const current = counts.get(tag.id) ?? 0;
      counts.set(tag.id, current + 1);
    }
  }

  return counts;
}
