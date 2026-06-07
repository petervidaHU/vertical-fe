import { Alert, Badge, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { db } from "../server/db";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import StoryExtraContentEditor from "../features/admin/components/StoryExtraContentEditor";
import { STORY_IMAGE_ACCEPT, STORY_IMAGE_MAX_BYTES } from "../features/admin/domain/storyImage.shared";
import { AdminPage, AdminPageHeader, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import { parseStoryExtraContent } from "../shared/validation/storySchemas";

type ActionData = { error?: string };
type StoryTypeValue = "CARD" | "LINE";

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

  const [epics, stories] = selectedJourney
    ? await Promise.all([
      db.epic.findMany({
        where: { journeyId: selectedJourney.id },
        orderBy: { title: "asc" },
      }),
      db.story.findMany({
        where: { journeyId: selectedJourney.id },
        orderBy: { createdAt: "desc" },
      }),
    ])
    : [[], []];

  return {
    journeys,
    selectedJourney,
    epics,
    stories,
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

      const suffix = journeyId ? `?success=Story+deleted` : "?success=Story+deleted";
      return redirect(`/admin/${journeyId}/stories${suffix}`);
    } catch {
      return { error: "Unable to delete story." };
    }
  }

  return { error: "Invalid action." };
}

const AdminStoriesRoute = () => {
  const {
    selectedJourney,
    epics,
    stories,
    success,
  } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const actionData = useActionData() as ActionData | undefined;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [storyType, setStoryType] = useState<StoryTypeValue>("CARD");

  useEffect(() => {
    if (actionData?.error) {
      setOptimisticDeletedIds([]);
    }
  }, [actionData?.error]);

  const visibleStories = useMemo(
    () => stories.filter((story) => !optimisticDeletedIds.includes(story.id)),
    [stories, optimisticDeletedIds],
  );
  const lineStories = stories.filter((story) => story.storyType === "LINE").length;
  const storiesWithImages = stories.filter((story) => Boolean(story.imageUrl)).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Stories"
        title="Create the moments that appear in the journey"
        description="Stories are either cards or line events. Create them here, then open a story to refine visuals, imagery, tags, and range details."
        actions={(
          <Button component={Link} to={`/admin/${selectedJourney?.id ?? ""}`} variant="default">
            Back to overview
          </Button>
        )}
      />

      <AdminStatGrid>
        <AdminStatCard label="Stories" value={visibleStories.length} description={`Managing ${selectedJourney?.name ?? "this journey"}.`} />
        <AdminStatCard label="Line stories" value={lineStories} description="Stories rendered as line events instead of cards." />
        <AdminStatCard label="With images" value={storiesWithImages} description="Stories already carrying an uploaded journey image." />
        <AdminStatCard label="Epics in scope" value={epics.length} description="Reference count for overlap planning while authoring stories." />
      </AdminStatGrid>

      <AdminSection
        title="Existing stories"
        description="Review the current story inventory first, then create a new one underneath when you need to add more content."
      >
        {visibleStories.length === 0 ? (
          <Text c="dimmed">No stories for this journey yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {visibleStories.map((story) => {
              const overlappingEpics = epics.filter(
                (epic) =>
                  epic.journeyId === story.journeyId
                  && epic.startPoint <= story.endPoint
                  && epic.endPoint >= story.startPoint,
              );

              return (
                <Paper
                  key={story.id}
                  radius="22px"
                  p="lg"
                  style={{
                    border: "1px solid rgba(111, 134, 145, 0.14)",
                    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 251, 0.94) 100%)",
                    display: "flex",
                    gap: "lg",
                  }}
                >
                  {/* Image on the left */}
                  <div
                    style={{
                      flex: "0 0 120px",
                      minHeight: 120,
                      borderRadius: 12,
                      background: "#f0f0f0",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {story.imageUrl ? (
                      <img
                        src={story.imageUrl}
                        alt={story.title}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <Text size="xs" c="dimmed" ta="center">
                        No image
                      </Text>
                    )}
                  </div>

                  {/* Content on the right */}
                  <Stack gap="sm" style={{ flex: 1 }}>
                    <Group justify="space-between" align="flex-start">
                      <div style={{ flex: 1 }}>
                        <Text fw={700} size="lg">{story.title}</Text>
                        <Text size="sm" c="dimmed">
                          {story.startPoint} - {story.endPoint} m
                        </Text>
                      </div>
                      <Badge color={story.storyType === "LINE" ? "teal" : "orange"} variant="light">
                        {story.storyType}
                      </Badge>
                    </Group>

                    <Text size="sm">
                      {story.description || "No description yet."}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Overlapping epics: {overlappingEpics.map((epic) => epic.title).join(", ") || "None"}
                    </Text>

                    <Group gap="xs">
                      <Button component={Link} to={`/admin/${selectedJourney?.id ?? ""}/stories/${story.id}`} size="sm">
                        Open story
                      </Button>
                      {confirmDeleteId === story.id ? (
                        <Group gap="xs">
                          <Form
                            method="post"
                            onSubmit={() => {
                              setOptimisticDeletedIds((prev) => [...prev, story.id]);
                              setConfirmDeleteId(null);
                            }}
                          >
                            <input type="hidden" name="id" value={story.id} />
                            <input type="hidden" name="journeyId" value={selectedJourney?.id ?? ""} />
                            <Button size="sm" color="red" type="submit" name="intent" value="delete">
                              Confirm delete
                            </Button>
                          </Form>
                          <Button size="sm" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                        </Group>
                      ) : (
                        <Button size="sm" color="red" variant="subtle" onClick={() => setConfirmDeleteId(story.id)}>
                          Delete
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
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

      {success ? <Alert color="green">{success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}
    </AdminPage>
  );
};

export default AdminStoriesRoute;
