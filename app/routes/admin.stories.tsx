import { Alert, Button, Card, Group, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { db } from "../server/db";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import BackgroundField from "../features/admin/components/BackgroundField";
import StoryExtraContentEditor from "../features/admin/components/StoryExtraContentEditor";
import {
  backgroundToCss,
  parseStoredBackground,
  tryParseBackgroundInput,
  serializeBackground,
} from "../shared/domain/background";
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
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const storyType = parseStoryType(formData.get("storyType"));
    const backgroundInput = String(formData.get("background") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
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

    const parsedBackground = tryParseBackgroundInput(backgroundInput);
    if (!parsedBackground.background) {
      return { error: parsedBackground.error ?? "Invalid background." };
    }

    try {
      await db.story.create({
        data: {
          title,
          description,
          extraContent,
          storyType,
          background: serializeBackground(parsedBackground.background),
          imageUrl,
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
    } catch {
      return { error: "Unable to create story." };
    }
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return { error: "Story id is required." };
    }

    try {
      await db.story.delete({ where: { id } });
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

  return (
    <Stack>
      <Title order={3}>Stories</Title>

      <Card withBorder>
        <Stack>
          <Title order={4}>Journey scope</Title>
          <Text size="sm" c="dimmed">
            Managing {selectedJourney?.name ?? "this journey"}.
          </Text>
          {selectedJourney ? (
            <Group>
              <Button component={Link} to="/admin/journeys" variant="light">
                Change journey
              </Button>
              <Button component={Link} to={`/admin/${selectedJourney.id}`} variant="subtle">
                Open journey
              </Button>
            </Group>
          ) : null}
        </Stack>
      </Card>

      <Card withBorder>
        <Form method="post">
          <Stack>
            <Title order={4}>Create story</Title>
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

            {storyType === "CARD" ? (
              <>
                <TextInput label="Card image URL (mock for now)" name="imageUrl" placeholder="https://example.com/mock-image.png" />
                <BackgroundField
                  name="background"
                  label="Card background"
                  defaultValue={serializeBackground({ mode: "color", color: "#ffd8a8" })}
                  defaultColor="#ffd8a8"
                  allowGradient={false}
                />
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
                <input type="hidden" name="imageUrl" value="" />
                <input type="hidden" name="background" value={serializeBackground({ mode: "color", color: "#ffd8a8" })} />
              </>
            )}

            <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue="0" min={0} />
            <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue="100" min={0} />
            <Button type="submit" name="intent" value="create" disabled={!selectedJourney}>Create Story</Button>
          </Stack>
        </Form>
      </Card>

      {success ? <Alert color="green">{success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <Card withBorder>
        <Stack>
          <Title order={4}>Existing stories</Title>
          {visibleStories.length === 0 ? (
            <Text c="dimmed">No stories for this journey yet.</Text>
          ) : (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Background</Table.Th>
                  <Table.Th>Overlapping epics</Table.Th>
                  <Table.Th>Range</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleStories.map((story) => (
                  <Table.Tr key={story.id}>
                    <Table.Td>{story.title}</Table.Td>
                    <Table.Td>{story.storyType}</Table.Td>
                    <Table.Td>
                      <div
                        style={{
                          width: 72,
                          height: 18,
                          borderRadius: 6,
                          border: "1px solid rgba(120, 120, 120, 0.5)",
                          background: backgroundToCss(parseStoredBackground(story.background, "#ffd8a8")),
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      {epics
                        .filter(
                          (epic) =>
                            epic.journeyId === story.journeyId
                            && epic.startPoint <= story.endPoint
                            && epic.endPoint >= story.startPoint,
                        )
                        .map((epic) => epic.title)
                        .join(", ") || "None"}
                    </Table.Td>
                    <Table.Td>
                      {story.startPoint} - {story.endPoint}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Link to={`/admin/${selectedJourney?.id ?? ""}/stories/${story.id}`}>Edit</Link>
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
                              <Button size="xs" color="red" type="submit" name="intent" value="delete">
                                Confirm
                              </Button>
                            </Form>
                            <Button size="xs" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                              Cancel
                            </Button>
                          </Group>
                        ) : (
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            onClick={() => setConfirmDeleteId(story.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};

export default AdminStoriesRoute;
