import { Badge, Button, Checkbox, Group, Modal, Stack, Text } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import type { TagLike } from "../../../features/tags/domain/tags";

type TagFilterModalProps = {
  opened: boolean;
  onClose: () => void;
  allTags: TagLike[];
  enabledTagIds: string[];
  onApply: (tagIds: string[]) => void;
  storyCounts: Map<string, number>;
  altitudeInfoCounts: Map<string, number>;
};

export function TagFilterModal({
  opened,
  onClose,
  allTags,
  enabledTagIds,
  onApply,
  storyCounts,
  altitudeInfoCounts,
}: TagFilterModalProps) {
  const [draftTagIds, setDraftTagIds] = useState<string[]>(enabledTagIds);

  useEffect(() => {
    if (opened) {
      setDraftTagIds(enabledTagIds);
    }
  }, [enabledTagIds, opened]);

  const allTagIds = useMemo(() => allTags.map((tag) => tag.id), [allTags]);
  const enabledTagIdSet = useMemo(() => new Set(enabledTagIds), [enabledTagIds]);
  const draftTagIdSet = useMemo(() => new Set(draftTagIds), [draftTagIds]);
  const hasChanges =
    draftTagIds.length !== enabledTagIds.length
    || draftTagIds.some((tagId) => !enabledTagIdSet.has(tagId));

  const handleToggleTag = (tagId: string) => {
    setDraftTagIds((current) => {
      if (current.includes(tagId)) {
        return current.filter((currentTagId) => currentTagId !== tagId);
      }

      return [...current, tagId];
    });
  };

  const handleCancel = () => {
    setDraftTagIds(enabledTagIds);
    onClose();
  };

  const handleApply = () => {
    onApply(draftTagIds);
    onClose();
  };

  if (allTags.length === 0) {
    return (
      <Modal opened={opened} onClose={onClose} title="Filter by tags" centered>
        <Text c="dimmed">No tags available for this journey.</Text>
      </Modal>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={handleCancel}
      title={
        <Group gap="xs">
          <span>Filter by tags</span>
          {draftTagIds.length > 0 && (
            <Badge variant="light" color="teal" size="sm">
              {draftTagIds.length} selected
            </Badge>
          )}
        </Group>
      }
      size="md"
      centered
    >
      <Stack gap="md">
        <Group gap="xs">
          <Button
            variant="subtle"
            size="xs"
            onClick={() => setDraftTagIds(allTagIds)}
            disabled={draftTagIds.length === allTagIds.length}
          >
            Select all
          </Button>
          <Button
            variant="subtle"
            size="xs"
            color="red"
            onClick={() => setDraftTagIds([])}
            disabled={draftTagIds.length === 0}
          >
            Deselect all
          </Button>
        </Group>

        <Stack gap="xs">
          {allTags.map((tag) => {
            const isEnabled = draftTagIdSet.has(tag.id);
            const storyCount = storyCounts.get(tag.id) ?? 0;
            const altitudeCount = altitudeInfoCounts.get(tag.id) ?? 0;
            const totalCount = storyCount + altitudeCount;

            return (
              <Checkbox
                key={tag.id}
                label={
                  <Group gap="xs" wrap="nowrap">
                    <Badge variant="light" color="teal" size="sm">
                      {tag.name}
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {totalCount} item{totalCount !== 1 ? "s" : ""}
                      {storyCount > 0 && (
                        <>
                          {" "}
                          · {storyCount} story{storyCount !== 1 ? "ies" : "y"}
                        </>
                      )}
                      {altitudeCount > 0 && (
                        <>
                          {" "}
                          · {altitudeCount} altitude info
                        </>
                      )}
                    </Text>
                  </Group>
                }
                checked={isEnabled}
                onChange={() => handleToggleTag(tag.id)}
                styles={{
                  label: { flex: 1 },
                  body: { alignItems: "center" },
                }}
              />
            );
          })}
        </Stack>

        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="light" onClick={handleApply} disabled={!hasChanges}>
            Apply
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
