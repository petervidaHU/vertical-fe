import {
  ActionIcon,
  Badge,
  Button,
  Checkbox,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { db } from "../server/db";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import StoryExtraContentEditor from "../features/admin/components/StoryExtraContentEditor";
import { STORY_IMAGE_ACCEPT, STORY_IMAGE_MAX_BYTES } from "../features/admin/domain/storyImage.shared";
import { AdminActionStatus, AdminPage, AdminPageHeader, AdminSection } from "../features/admin/components/AdminScaffold";
import { parseStoryExtraContent } from "../shared/validation/storySchemas";
import { StoryDetailContent, type StoryPreviewData } from "../features/timeline/components/StoryDetailContent";

type ActionData = { error?: string };
type StoryTypeValue = "CARD" | "LINE";
type SortField = "altitude" | "title";
type SortDir = "asc" | "desc";

function parsePoint(value: FormDataEntryValue | null): number {
  return Number.parseInt(String(value ?? ""), 10);
}

function parseStoryType(value: FormDataEntryValue | null): StoryTypeValue {
  return String(value ?? "CARD").toUpperCase() === "LINE" ? "LINE" : "CARD";
}

function readSuccessMessage(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("success");
}

export async function loader({ request, params }: { request: Request; params: { journeyId?: string } }) {
  const journeyId = params.journeyId?.trim() ?? "";
  const journeys = await db.journey.findMany({ orderBy: { name: "asc" } });
  const selectedJourney = journeys.find((journey) => journey.id === journeyId) ?? null;

  const [epics, stories, journeyTags] = selectedJourney
    ? await Promise.all([
      db.epic.findMany({
        where: { journeyId: selectedJourney.id },
        orderBy: { title: "asc" },
      }),
      db.story.findMany({
        where: { journeyId: selectedJourney.id },
        orderBy: { startPoint: "asc" },
        include: { tags: { select: { id: true, name: true } } },
      }),
      db.tag.findMany({
        where: { journeyId: selectedJourney.id },
        orderBy: { name: "asc" },
      }),
    ])
    : [[], [], []];

  return {
    journeys,
    selectedJourney,
    epics,
    stories,
    journeyTags,
    success: readSuccessMessage(request),
  };
}

export async function action({ request, params }: { request: Request; params: { journeyId?: string } }): Promise<Response | ActionData> {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const journeyId = params.journeyId?.trim() ?? "";

  if (intent === "create") {
    const {
      deleteManagedStoryImage,
      saveStoryImage,
    } = await import("../features/admin/domain/storyImage.server");
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const storyType = parseStoryType(formData.get("storyType"));
    const lineColor = String(formData.get("lineColor") ?? "#4ecdc4").trim() || "#4ecdc4";
    const lineWidth = parsePoint(formData.get("lineWidth"));
    const lineLabel = String(formData.get("lineLabel") ?? "").trim();
    const tooltipText = String(formData.get("tooltipText") ?? "").trim();
    const tooltipImageUrl = String(formData.get("tooltipImageUrl") ?? "").trim() || null;
    const extraContent = parseStoryExtraContent(formData);
    const startPoint = parsePoint(formData.get("startPoint"));
    const endPoint = parsePoint(formData.get("endPoint"));

    if (!title || !journeyId || Number.isNaN(startPoint) || Number.isNaN(endPoint)) {
      return { error: "Title, journey, start, and end are required." };
    }

    if (startPoint > endPoint) {
      return { error: "Start point must be less than or equal to end point." };
    }

    if (Number.isNaN(lineWidth) || lineWidth < 1 || lineWidth > 64) {
      return { error: "Line width must be between 1 and 64." };
    }

    let uploadedStoryImage: string | null = null;

    try {
      uploadedStoryImage = await saveStoryImage(formData.get("storyImageFile"), {
        fileNamePrefix: title,
      });

      await db.story.create({
        data: {
          title,
          description,
          extraContent,
          storyType,
          background: null,
          imageUrl: uploadedStoryImage,
          lineColor,
          lineWidth,
          lineLabel,
          tooltipText,
          tooltipImageUrl,
          journeyId,
          startPoint,
          endPoint,
        },
      });

      return redirect(`/admin/${journeyId}/stories?success=Story+created`);
    } catch (error) {
      if (uploadedStoryImage) {
        await deleteManagedStoryImage(uploadedStoryImage);
      }

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Unable to create story." };
    }
  }

  if (intent === "delete") {
    const { deleteManagedStoryImage } = await import("../features/admin/domain/storyImage.server");
    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return { error: "Story id is required." };
    }

    try {
      const existingStory = await db.story.findUnique({
        where: { id },
        select: { imageUrl: true },
      });

      await db.story.delete({ where: { id } });
      await deleteManagedStoryImage(existingStory?.imageUrl);

      return redirect(`/admin/${journeyId}/stories?success=Story+deleted`);
    } catch {
      return { error: "Unable to delete story." };
    }
  }

  return { error: "Invalid action." };
}

function IconEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function IconSort({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={active ? "currentColor" : "#aaa"} strokeWidth={2.5} strokeLinecap="round">
      {dir === "asc" || !active ? <path d="M12 5l-7 7h14l-7-7z" /> : null}
      {dir === "desc" || !active ? <path d="M12 19l7-7H5l7 7z" /> : null}
    </svg>
  );
}

function formatAlt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)} km`;
  return `${n} m`;
}

const AdminStoriesRoute = () => {
  const {
    selectedJourney,
    stories,
    journeyTags,
    success,
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const actionData = useActionData() as ActionData | undefined;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [storyType, setStoryType] = useState<StoryTypeValue>("CARD");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewStory, setPreviewStory] = useState<StoryPreviewData | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<"all" | "CARD" | "LINE">("all");
  const [filterHasImage, setFilterHasImage] = useState<"all" | "yes" | "no">("all");
  const [filterAltMin, setFilterAltMin] = useState("");
  const [filterAltMax, setFilterAltMax] = useState("");
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());

  // Sort
  const [sortField, setSortField] = useState<SortField>("altitude");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    if (actionData?.error) setOptimisticDeletedIds([]);
  }, [actionData?.error]);

  const altMin = filterAltMin !== "" ? Number(filterAltMin) : null;
  const altMax = filterAltMax !== "" ? Number(filterAltMax) : null;

  const visibleStories = useMemo(() => {
    let result = stories.filter((s) => !optimisticDeletedIds.includes(s.id));

    if (filterType !== "all") result = result.filter((s) => s.storyType === filterType);
    if (filterHasImage === "yes") result = result.filter((s) => !!s.imageUrl);
    if (filterHasImage === "no") result = result.filter((s) => !s.imageUrl);
    if (altMin !== null && !Number.isNaN(altMin)) result = result.filter((s) => s.endPoint >= altMin);
    if (altMax !== null && !Number.isNaN(altMax)) result = result.filter((s) => s.startPoint <= altMax);
    if (filterTagIds.size > 0) {
      result = result.filter((s) => s.tags.some((t) => filterTagIds.has(t.id)));
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === "altitude") cmp = a.startPoint - b.startPoint;
      else cmp = a.title.localeCompare(b.title);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [stories, optimisticDeletedIds, filterType, filterHasImage, altMin, altMax, filterTagIds, sortField, sortDir]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  }

  function toggleSelectAll() {
    if (selectedIds.size === visibleStories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleStories.map((s) => s.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTagFilter(id: string) {
    setFilterTagIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const allSelected = visibleStories.length > 0 && selectedIds.size === visibleStories.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Stories"
        title="Create the moments that appear in the journey"
      />

      <AdminSection
        title="Existing stories"
        description="Filter, sort, and manage stories. Select rows for bulk operations."
      >
        {/* Filter bar */}
        <Paper
          radius={16}
          p="md"
          style={{
            background: "rgba(248, 250, 255, 0.9)",
            border: "1px solid rgba(111, 134, 145, 0.14)",
            marginBottom: 12,
          }}
        >
          <Stack gap="sm">
            <Group gap="md" wrap="wrap" align="flex-end">
              <div>
                <Text size="xs" fw={600} c="dimmed" mb={4}>Type</Text>
                <SegmentedControl
                  size="xs"
                  value={filterType}
                  onChange={(v) => setFilterType(v as "all" | "CARD" | "LINE")}
                  data={[
                    { label: "All", value: "all" },
                    { label: "Card", value: "CARD" },
                    { label: "Line", value: "LINE" },
                  ]}
                />
              </div>
              <div>
                <Text size="xs" fw={600} c="dimmed" mb={4}>Image</Text>
                <SegmentedControl
                  size="xs"
                  value={filterHasImage}
                  onChange={(v) => setFilterHasImage(v as "all" | "yes" | "no")}
                  data={[
                    { label: "All", value: "all" },
                    { label: "Has image", value: "yes" },
                    { label: "No image", value: "no" },
                  ]}
                />
              </div>
              <Group gap="xs" align="flex-end">
                <TextInput
                  label={<Text size="xs" fw={600} c="dimmed">Alt. min (m)</Text>}
                  size="xs"
                  w={100}
                  type="number"
                  placeholder="0"
                  value={filterAltMin}
                  onChange={(e) => setFilterAltMin(e.currentTarget.value)}
                />
                <TextInput
                  label={<Text size="xs" fw={600} c="dimmed">Alt. max (m)</Text>}
                  size="xs"
                  w={100}
                  type="number"
                  placeholder="∞"
                  value={filterAltMax}
                  onChange={(e) => setFilterAltMax(e.currentTarget.value)}
                />
              </Group>
            </Group>

            {journeyTags.length > 0 ? (
              <Group gap="xs">
                <Text size="xs" fw={600} c="dimmed">Tags:</Text>
                {journeyTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    size="sm"
                    variant={filterTagIds.has(tag.id) ? "filled" : "outline"}
                    style={{ cursor: "pointer" }}
                    onClick={() => toggleTagFilter(tag.id)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </Group>
            ) : null}
          </Stack>
        </Paper>

        {/* Table */}
        {visibleStories.length === 0 ? (
          <Text c="dimmed" size="sm">No stories match the current filters.</Text>
        ) : (
          <Paper
            radius={16}
            style={{
              border: "1px solid rgba(111, 134, 145, 0.14)",
              overflow: "hidden",
            }}
          >
            <Table highlightOnHover verticalSpacing="xs" horizontalSpacing="sm">
              <Table.Thead style={{ background: "rgba(248, 250, 255, 0.95)" }}>
                <Table.Tr>
                  <Table.Th w={36}>
                    <Checkbox
                      size="xs"
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={toggleSelectAll}
                    />
                  </Table.Th>
                  <Table.Th style={{ cursor: "pointer" }} onClick={() => toggleSort("title")}>
                    <Group gap={4}>
                      <Text size="xs" fw={700}>Title</Text>
                      <IconSort active={sortField === "title"} dir={sortDir} />
                    </Group>
                  </Table.Th>
                  <Table.Th w={70}>
                    <Text size="xs" fw={700}>Type</Text>
                  </Table.Th>
                  <Table.Th w={160} style={{ cursor: "pointer" }} onClick={() => toggleSort("altitude")}>
                    <Group gap={4}>
                      <Text size="xs" fw={700}>Altitude</Text>
                      <IconSort active={sortField === "altitude"} dir={sortDir} />
                    </Group>
                  </Table.Th>
                  <Table.Th w={70}>
                    <Text size="xs" fw={700}>Image</Text>
                  </Table.Th>
                  <Table.Th w={110}>
                    <Text size="xs" fw={700}>Actions</Text>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleStories.map((story) => (
                  <Table.Tr
                    key={story.id}
                    style={{
                      background: selectedIds.has(story.id) ? "rgba(100, 160, 255, 0.07)" : undefined,
                    }}
                  >
                    <Table.Td>
                      <Checkbox
                        size="xs"
                        checked={selectedIds.has(story.id)}
                        onChange={() => toggleSelect(story.id)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Text size="sm" fw={600} lineClamp={1}>{story.title}</Text>
                        {story.tags.length > 0 ? (
                          <Group gap={4}>
                            {story.tags.map((t) => (
                              <Badge key={t.id} size="xs" variant="dot" color="gray">{t.name}</Badge>
                            ))}
                          </Group>
                        ) : null}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="xs"
                        color={story.storyType === "LINE" ? "teal" : "orange"}
                        variant="light"
                      >
                        {story.storyType}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed">
                        {story.storyType === "LINE"
                          ? formatAlt(story.startPoint)
                          : `${formatAlt(story.startPoint)} – ${formatAlt(story.endPoint)}`}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {story.imageUrl ? (
                        <Text size="xs" c="teal" fw={600}>Yes</Text>
                      ) : (
                        <Text size="xs" c="dimmed">—</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Tooltip label="Edit" withArrow position="top">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            component={Link}
                            to={`/admin/${selectedJourney?.id ?? ""}/stories/${story.id}`}
                          >
                            <IconEdit />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Preview card" withArrow position="top">
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="teal"
                            onClick={() => setPreviewStory(story)}
                          >
                            <IconEye />
                          </ActionIcon>
                        </Tooltip>
                        {confirmDeleteId === story.id ? (
                          <Group gap={4}>
                            <Form
                              method="post"
                              onSubmit={() => {
                                setOptimisticDeletedIds((prev) => [...prev, story.id]);
                                setConfirmDeleteId(null);
                              }}
                            >
                              <input type="hidden" name="id" value={story.id} />
                              <input type="hidden" name="journeyId" value={selectedJourney?.id ?? ""} />
                              <Button size="compact-xs" color="red" type="submit" name="intent" value="delete">
                                Confirm
                              </Button>
                            </Form>
                            <Button size="compact-xs" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                              Cancel
                            </Button>
                          </Group>
                        ) : (
                          <Tooltip label="Delete" withArrow position="top">
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              onClick={() => setConfirmDeleteId(story.id)}
                            >
                              <IconTrash />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            <Group px="md" py="xs" style={{ borderTop: "1px solid rgba(111, 134, 145, 0.1)", background: "rgba(248, 250, 255, 0.6)" }}>
              <Text size="xs" c="dimmed">
                {visibleStories.length} {visibleStories.length === 1 ? "story" : "stories"}
                {selectedIds.size > 0 ? ` · ${selectedIds.size} selected` : ""}
              </Text>
            </Group>
          </Paper>
        )}
      </AdminSection>

      <AdminSection
        title="Create story"
        description="Choose whether the story is a card or a line event, then define its visuals and the altitude range where it appears."
      >
        <Form method="post" encType="multipart/form-data">
          <Stack>
            {selectedJourney ? <Text size="sm" c="dimmed">Journey: {selectedJourney.name}</Text> : null}
            <TextInput label="Title" name="title" required />
            <label>
              Story type
              <select
                name="storyType"
                value={storyType}
                onChange={(event) => setStoryType(parseStoryType(event.currentTarget.value))}
              >
                <option value="CARD">Card</option>
                <option value="LINE">Line</option>
              </select>
            </label>
            <TextInput label="Description" name="description" />
            <StoryExtraContentEditor name="extraContent" />
            <label htmlFor="createStoryImageFile">Story image</label>
            <input
              id="createStoryImageFile"
              name="storyImageFile"
              type="file"
              accept={STORY_IMAGE_ACCEPT}
            />
            <Text size="xs" c="dimmed">
              Optional. Upload a PNG, JPEG, or WebP up to {Math.round(STORY_IMAGE_MAX_BYTES / (1024 * 1024))} MB.
              Images are resized and optimized to WebP for timeline rendering.
            </Text>

            {storyType === "CARD" ? (
              <>
                <input type="hidden" name="lineColor" value="#4ecdc4" />
                <input type="hidden" name="lineWidth" value="4" />
                <input type="hidden" name="lineLabel" value="" />
                <input type="hidden" name="tooltipText" value="" />
                <input type="hidden" name="tooltipImageUrl" value="" />
              </>
            ) : (
              <>
                <TextInput label="Line color" name="lineColor" defaultValue="#4ecdc4" />
                <TextInput label="Line width" name="lineWidth" type="number" inputMode="numeric" defaultValue="4" min={1} max={64} />
                <TextInput label="Line label" name="lineLabel" placeholder="Checkpoint" />
                <TextInput label="Tooltip text" name="tooltipText" placeholder="Reached checkpoint" />
                <TextInput label="Tooltip image URL (mock)" name="tooltipImageUrl" placeholder="https://example.com/mock-tooltip-image.png" />
              </>
            )}

            <Group grow>
              <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue="0" min={0} />
              <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue="100" min={0} />
            </Group>
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="create" disabled={!selectedJourney}>Create story</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <AdminActionStatus success={success} error={actionData?.error} />

      <Modal
        opened={previewStory !== null}
        onClose={() => setPreviewStory(null)}
        withCloseButton={false}
        size="lg"
        centered
        padding={0}
        overlayProps={{ backgroundOpacity: 0.6, blur: 4 }}
        transitionProps={{ transition: "pop", duration: 220 }}
        styles={{
          content: { background: "transparent", boxShadow: "none", overflow: "visible" },
          body: { padding: 0 },
        }}
      >
        {previewStory ? (
          <StoryDetailContent story={previewStory} onClose={() => setPreviewStory(null)} />
        ) : null}
      </Modal>
    </AdminPage>
  );
};

export default AdminStoriesRoute;
