import { Alert, Button, Card, Group, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { db } from "../server/db";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import BackgroundField from "../features/admin/components/BackgroundField";
import {
  backgroundToCss,
  defaultColorBackground,
  parseStoredBackground,
  primaryColorFromBackground,
  serializeBackground,
  tryParseBackgroundInput,
} from "../shared/domain/background";

type ActionData = { error?: string };

function parsePoint(value: FormDataEntryValue | null): number {
  return Number.parseInt(String(value ?? ""), 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumberField(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(numeric)) {
    return null;
  }

  return Math.trunc(numeric);
}

function parseBackgroundField(value: unknown, fallbackColor: string): { serialized: string; color: string } | { error: string } {
  if (value === undefined || value === null || value === "") {
    const fallback = defaultColorBackground(fallbackColor);
    return {
      serialized: serializeBackground(fallback),
      color: primaryColorFromBackground(fallback),
    };
  }

  const rawValue = typeof value === "string" ? value : JSON.stringify(value);
  const parsed = tryParseBackgroundInput(rawValue);

  if (!parsed.background) {
    return { error: parsed.error ?? "Invalid background format." };
  }

  return {
    serialized: serializeBackground(parsed.background),
    color: primaryColorFromBackground(parsed.background),
  };
}

type ParsedImportPayload = {
  epics: Array<{
    title: string;
    startPoint: number;
    endPoint: number;
    background: string;
    color: string;
  }>;
  stories: Array<{
    title: string;
    description: string;
    extraContent: string;
    storyType: "CARD" | "LINE";
    background: string;
    imageUrl: string | null;
    lineColor: string;
    lineWidth: number;
    lineLabel: string;
    tooltipText: string;
    tooltipImageUrl: string | null;
    startPoint: number;
    endPoint: number;
  }>;
};

function normalizeImportPayload(payload: unknown): ParsedImportPayload {
  if (!isRecord(payload)) {
    throw new Error("JSON root must be an object with epics and/or stories arrays.");
  }

  const rawEpics = payload.epics;
  const rawStories = payload.stories;
  const epics = Array.isArray(rawEpics) ? rawEpics : [];
  const stories = Array.isArray(rawStories) ? rawStories : [];

  if (epics.length === 0 && stories.length === 0) {
    throw new Error("Provide at least one epic or one story in the JSON payload.");
  }

  const parsedEpics = epics.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Epic #${index + 1} must be an object.`);
    }

    const title = String(item.title ?? "").trim();
    const startPoint = parseNumberField(item.startPoint);
    const endPoint = parseNumberField(item.endPoint);

    if (!title || startPoint === null || endPoint === null) {
      throw new Error(`Epic #${index + 1} requires title, startPoint, and endPoint.`);
    }

    if (startPoint > endPoint) {
      throw new Error(`Epic #${index + 1} startPoint must be <= endPoint.`);
    }

    const parsedBackground = parseBackgroundField(item.background, "#4ecdc4");
    if ("error" in parsedBackground) {
      throw new Error(`Epic #${index + 1} background is invalid: ${parsedBackground.error}`);
    }

    return {
      title,
      startPoint,
      endPoint,
      background: parsedBackground.serialized,
      color: parsedBackground.color,
    };
  });

  const parsedStories = stories.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(`Story #${index + 1} must be an object.`);
    }

    const title = String(item.title ?? "").trim();
    const description = String(item.description ?? "").trim();
    const extraContent = String(item.extraContent ?? "").trim();
    const rawStoryType = String(item.storyType ?? "CARD").trim().toUpperCase();
    const storyType: "CARD" | "LINE" = rawStoryType === "LINE" ? "LINE" : "CARD";

    const imageUrlRaw = String(item.imageUrl ?? "").trim();
    const tooltipImageUrlRaw = String(item.tooltipImageUrl ?? "").trim();
    const lineColor = String(item.lineColor ?? "#4ecdc4").trim() || "#4ecdc4";
    const lineLabel = String(item.lineLabel ?? "").trim();
    const tooltipText = String(item.tooltipText ?? "").trim();
    const startPoint = parseNumberField(item.startPoint);
    const endPoint = parseNumberField(item.endPoint);
    const lineWidth = parseNumberField(item.lineWidth ?? 4);

    if (!title || startPoint === null || endPoint === null) {
      throw new Error(`Story #${index + 1} requires title, startPoint, and endPoint.`);
    }

    if (startPoint > endPoint) {
      throw new Error(`Story #${index + 1} startPoint must be <= endPoint.`);
    }

    if (lineWidth === null || lineWidth < 1 || lineWidth > 64) {
      throw new Error(`Story #${index + 1} lineWidth must be between 1 and 64.`);
    }

    const parsedBackground = parseBackgroundField(item.background, "#ffd8a8");
    if ("error" in parsedBackground) {
      throw new Error(`Story #${index + 1} background is invalid: ${parsedBackground.error}`);
    }

    return {
      title,
      description,
      extraContent,
      storyType,
      background: parsedBackground.serialized,
      imageUrl: imageUrlRaw || null,
      lineColor,
      lineWidth,
      lineLabel,
      tooltipText,
      tooltipImageUrl: tooltipImageUrlRaw || null,
      startPoint,
      endPoint,
    };
  });

  return {
    epics: parsedEpics,
    stories: parsedStories,
  };
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
          orderBy: { createdAt: "desc" },
        }),
        db.story.findMany({
          where: { journeyId: selectedJourney.id },
          orderBy: { startPoint: "asc" },
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

  if (!journeyId) {
    return { error: "Journey id is required." };
  }

  if (intent === "create") {
    const title = String(formData.get("title") ?? "").trim();
    const backgroundInput = String(formData.get("background") ?? "").trim();
    const startPoint = parsePoint(formData.get("startPoint"));
    const endPoint = parsePoint(formData.get("endPoint"));

    if (!title || !journeyId || Number.isNaN(startPoint) || Number.isNaN(endPoint)) {
      return { error: "Title, journey, start, and end are required." };
    }

    if (startPoint > endPoint) {
      return { error: "Start point must be less than or equal to end point." };
    }

    const parsedBackground = tryParseBackgroundInput(backgroundInput);
    if (!parsedBackground.background) {
      return { error: parsedBackground.error ?? "Invalid background." };
    }

    try {
      await db.epic.create({
        data: {
          title,
          color: primaryColorFromBackground(parsedBackground.background),
          background: serializeBackground(parsedBackground.background),
          journeyId,
          startPoint,
          endPoint,
        },
      });
      return redirect(`/admin/${journeyId}/epics?success=Epic+created`);
    } catch {
      return { error: "Unable to create epic." };
    }
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return { error: "Epic id is required." };
    }

    try {
      await db.epic.delete({ where: { id } });
      return redirect(`/admin/${journeyId}/epics?success=Epic+deleted`);
    } catch {
      return { error: "Unable to delete epic." };
    }
  }

  if (intent === "import-json") {
    const uploadedFile = formData.get("jsonFile");
    if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
      return { error: "Select a non-empty .json file to import." };
    }

    try {
      const raw = await uploadedFile.text();
      const parsed = normalizeImportPayload(JSON.parse(raw));

      await db.$transaction(async (tx) => {
        for (const epic of parsed.epics) {
          await tx.epic.create({
            data: {
              title: epic.title,
              color: epic.color,
              background: epic.background,
              journeyId,
              startPoint: epic.startPoint,
              endPoint: epic.endPoint,
            },
          });
        }

        for (const story of parsed.stories) {
          await tx.story.create({
            data: {
              title: story.title,
              description: story.description,
              extraContent: story.extraContent,
              storyType: story.storyType,
              background: story.background,
              imageUrl: story.imageUrl,
              lineColor: story.lineColor,
              lineWidth: story.lineWidth,
              lineLabel: story.lineLabel,
              tooltipText: story.tooltipText,
              tooltipImageUrl: story.tooltipImageUrl,
              journeyId,
              startPoint: story.startPoint,
              endPoint: story.endPoint,
            },
          });
        }
      });

      const successText = encodeURIComponent(`Imported ${parsed.epics.length} epics and ${parsed.stories.length} stories`);
      return redirect(`/admin/${journeyId}/epics?success=${successText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import JSON.";
      return { error: message };
    }
  }

  return { error: "Invalid action." };
}

const AdminEpicsRoute = () => {
  const { selectedJourney, epics, stories, success } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const actionData = useActionData() as ActionData | undefined;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    if (actionData?.error) {
      setOptimisticDeletedIds([]);
    }
  }, [actionData?.error]);

  const visibleEpics = useMemo(
    () => epics.filter((epic) => !optimisticDeletedIds.includes(epic.id)),
    [epics, optimisticDeletedIds],
  );

  return (
    <Stack>
      <Title order={3}>Epics</Title>

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
        <Form method="post" encType="multipart/form-data">
          <Stack>
            <Title order={4}>Bulk import epics and stories (JSON)</Title>
            <Text size="sm" c="dimmed">
              Download the schema samples, generate JSON in any AI chat using the prompt, then upload that file here.
            </Text>
            <Group gap="xs">
              <Button component="a" href="/admin-import/epic.schema.json" download variant="light" size="xs">
                Download epic schema
              </Button>
              <Button component="a" href="/admin-import/story.schema.json" download variant="light" size="xs">
                Download story schema
              </Button>
              <Button component="a" href="/admin-import/journey-import.template.json" download variant="light" size="xs">
                Download JSON template
              </Button>
              <Button component="a" href="/admin-import/ai-prompt.md" download variant="subtle" size="xs">
                Download AI prompt
              </Button>
            </Group>
            <label htmlFor="jsonFileUpload">JSON file</label>
            <input id="jsonFileUpload" name="jsonFile" type="file" accept="application/json,.json" required />
            <Button type="submit" name="intent" value="import-json" disabled={!selectedJourney}>
              Import JSON into this journey
            </Button>
          </Stack>
        </Form>
      </Card>

      <Card withBorder>
        <Form method="post">
          <Stack>
            <Title order={4}>Create epic</Title>
            {selectedJourney ? <Text size="sm" c="dimmed">Journey: {selectedJourney.name}</Text> : null}
            <TextInput label="Title" name="title" required />
            <BackgroundField
              name="background"
              label="Background"
              defaultValue={serializeBackground({ mode: "color", color: "#4ecdc4" })}
              defaultColor="#4ecdc4"
            />
            <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue="0" min={0} />
            <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue="100" min={0} />
            <Button type="submit" name="intent" value="create" disabled={!selectedJourney}>Create Epic</Button>
          </Stack>
        </Form>
      </Card>

      {success ? <Alert color="green">{success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <Card withBorder>
        <Stack>
          <Title order={4}>Existing epics</Title>
          {visibleEpics.length === 0 ? (
            <Text c="dimmed">No epics for this journey yet.</Text>
          ) : (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Background</Table.Th>
                  <Table.Th>Range</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleEpics.map((epic) => (
                  <Table.Tr key={epic.id}>
                    <Table.Td>{epic.title}</Table.Td>
                    <Table.Td>
                      <div
                        style={{
                          width: 72,
                          height: 18,
                          borderRadius: 6,
                          border: "1px solid rgba(120, 120, 120, 0.5)",
                          background: backgroundToCss(parseStoredBackground(epic.background, epic.color)),
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      {epic.startPoint} - {epic.endPoint}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Link to={`/admin/${selectedJourney?.id ?? ""}/epics/${epic.id}`}>Edit</Link>
                        {confirmDeleteId === epic.id ? (
                          <Group gap="xs">
                            <Form
                              method="post"
                              onSubmit={() => {
                                setOptimisticDeletedIds((prev) => [...prev, epic.id]);
                                setConfirmDeleteId(null);
                              }}
                            >
                              <input type="hidden" name="id" value={epic.id} />
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
                            onClick={() => setConfirmDeleteId(epic.id)}
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

export default AdminEpicsRoute;
