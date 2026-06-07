import { ActionIcon, Badge, Group, Stack, Text, TextInput } from "@mantine/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { isTagNameDuplicate, normalizeTagName, TAG_SYSTEM_MAX_COUNT, validateTagName } from "../domain/tags";
import type { TagLike } from "../domain/tags";

export type TagSuggestion = TagLike & {
  usageCount?: number;
};

type TagSelectorProps = {
  /** Currently selected tags */
  selected: TagLike[];
  /** All tags available in this journey */
  allTags: TagSuggestion[];
  /** Max unique tags in the system */
  maxTags?: number;
  /** Called when tags selection changes */
  onChange: (tags: TagLike[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
};

/**
 * TagSelector allows searching, selecting, and creating tags bound to a story or altitude info.
 * - Type 3+ characters to search
 * - Pick from suggestions or hit Enter to create a new one
 * - Toggle selected tags with click
 */
export default function TagSelector({
  selected,
  allTags,
  maxTags = TAG_SYSTEM_MAX_COUNT,
  onChange,
  disabled = false,
}: TagSelectorProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const normalizedInput = normalizeTagName(query);
  const normalizedDebouncedQuery = normalizeTagName(debouncedQuery);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const suggestions = allTags.filter((tag) => {
    if (normalizedDebouncedQuery.length < 3) return false;
    const alreadySelected = selected.some((s) => s.id === tag.id);
    if (alreadySelected) return false;
    return normalizeTagName(tag.name).includes(normalizedDebouncedQuery);
  });

  const canCreateNew =
    normalizedInput.length >= 3 &&
    validateTagName(query).valid &&
    !isTagNameDuplicate(
      query,
      allTags.map((t) => t.name),
    ) &&
    allTags.length < maxTags;
  const needsMoreCharacters = query.trim().length > 0 && normalizedInput.length < 3;

  const addTag = useCallback(
    (tag: TagLike) => {
      if (selected.some((s) => s.id === tag.id)) return;
      setValidationError(null);
      setQuery("");
      onChange([...selected, tag]);
    },
    [selected, onChange],
  );

  const removeTag = useCallback(
    (tagId: string) => {
      setValidationError(null);
      onChange(selected.filter((s) => s.id !== tagId));
    },
    [selected, onChange],
  );

  const handleCreateNew = useCallback(() => {
    if (!canCreateNew) return;

    const validation = validateTagName(query);
    if (!validation.valid) {
      setValidationError(validation.error ?? "Invalid tag name.");
      return;
    }

    if (allTags.length >= maxTags) {
      setValidationError(`Cannot create more than ${maxTags} unique tags.`);
      return;
    }

    // Create a temporary client-side tag — the actual creation happens in the form action.
    // We use a placeholder id that the server will replace.
    const placeholderId = `new:${normalizeTagName(query)}`;
    addTag({ id: placeholderId, name: query.trim() });
    setShowSuggestions(false);
  }, [canCreateNew, query, allTags.length, maxTags, addTag]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (canCreateNew) {
          handleCreateNew();
        }
      }
    },
    [canCreateNew, handleCreateNew],
  );

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Stack gap="xs" ref={containerRef}>
      <Text size="sm" fw={600}>
        Tags
      </Text>

      {selected.length > 0 && (
        <Group gap={4} wrap="wrap">
          {selected.map((tag) => (
            <Badge
              key={tag.id}
              variant="light"
              color="teal"
              rightSection={
                !disabled && (
                  <ActionIcon
                    size="xs"
                    variant="transparent"
                    color="teal"
                    onClick={() => removeTag(tag.id)}
                    aria-label={`Remove tag ${tag.name}`}
                  >
                    ×
                  </ActionIcon>
                )
              }
            >
              {tag.name}
            </Badge>
          ))}
        </Group>
      )}

      {!disabled && (
        <div style={{ position: "relative" }}>
          <TextInput
            placeholder="Search or add tags (3+ chars)..."
            value={query}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setValidationError(null);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            error={validationError}
          />

          {showSuggestions && query.length > 0 && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 10,
                background: "var(--mantine-color-body)",
                border: "1px solid var(--mantine-color-default-border)",
                borderRadius: "var(--mantine-radius-md)",
                boxShadow: "var(--mantine-shadow-md)",
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {needsMoreCharacters && (
                <Text size="sm" c="dimmed" p="sm">
                  Type at least 3 characters to search existing tags.
                </Text>
              )}

              {!needsMoreCharacters && suggestions.length === 0 && !canCreateNew && (
                <Text size="sm" c="dimmed" p="sm">
                  No matching tags found.
                </Text>
              )}

              {suggestions.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    addTag(tag);
                    setShowSuggestions(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text size="sm">{tag.name}</Text>
                  {tag.usageCount !== undefined && (
                    <Text size="xs" c="dimmed">
                      {tag.usageCount} uses
                    </Text>
                  )}
                </button>
              ))}

              {canCreateNew && (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    border: "none",
                    borderTop: "1px solid var(--mantine-color-default-border)",
                    background: "var(--mantine-color-teal-light)",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <Text size="sm" c="teal" fw={600}>
                    + Create "{query.trim()}"
                  </Text>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Hidden inputs for form submission */}
      {selected.map((tag) => (
        <input key={tag.id} type="hidden" name="tagIds" value={tag.id} />
      ))}
    </Stack>
  );
}
