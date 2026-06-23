import { EPIC_BACKGROUND_IMAGE_ACCEPT, EPIC_BACKGROUND_IMAGE_MAX_BYTES } from "../features/admin/domain/epicBackgroundImage.shared";
import { normalizeBackgroundPatternConfig, type BackgroundPatternConfig } from "../features/timeline/pixi/layout/epicBackgroundPattern";
import { normalizeImportPayload } from "../features/admin/domain/importPayload";
import { readImportJsonSource } from "../features/admin/domain/importJsonSource";
import {
  backgroundToCss,
  parseStoredBackground,
  primaryColorFromBackground,
  serializeBackground,
  tryParseBackgroundInput,
} from "../shared/domain/background";
import { Button, Checkbox, Divider, Group, NumberInput, Paper, SimpleGrid, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { db } from "../server/db";
import BackgroundField from "../features/admin/components/BackgroundField";
import { AdminActionStatus, AdminPage, AdminPageHeader, AdminSection } from "../features/admin/components/AdminScaffold";

type ActionData = { error?: string };

function parsePoint(value: FormDataEntryValue | null): number {
  return Number.parseInt(String(value ?? ""), 10);
}

function parsePatternConfig(formData: FormData): BackgroundPatternConfig | null {
  const densityRaw = formData.get("patternDensity");
  const minScaleRaw = formData.get("patternMinScale");
  const maxScaleRaw = formData.get("patternMaxScale");
  const minXRaw = formData.get("patternMinXRatio");
  const maxXRaw = formData.get("patternMaxXRatio");

  if ([densityRaw, minScaleRaw, maxScaleRaw, minXRaw, maxXRaw].every((value) => value === null || value === "")) {
    return null;
  }

  return normalizeBackgroundPatternConfig({
    density: densityRaw,
    minScale: minScaleRaw,
    maxScale: maxScaleRaw,
    minXRatio: minXRaw,
    maxXRatio: maxXRaw,
  });
}

function readSuccessMessage(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("success");
}

export async function loader({ request, params }: { request: Request; params: { journeyId?: string } }) {
  const journeyId = params.journeyId?.trim() ?? "";
  const journeys = await db.journey.findMany({ orderBy: { name: "asc" } });
  const selectedJourney = journeys.find((journey) => journey.id === journeyId) ?? null;

  const [epics, stories, altitudeInfos] = selectedJourney
    ? await Promise.all([
        db.epic.findMany({
          where: { journeyId: selectedJourney.id },
          orderBy: { createdAt: "desc" },
        }),
        db.story.findMany({
          where: { journeyId: selectedJourney.id },
          orderBy: { startPoint: "asc" },
        }),
        db.altitudeInfo.findMany({
          where: { journeyId: selectedJourney.id },
          orderBy: [{ order: "asc" }, { title: "asc" }],
          include: {
            values: {
              orderBy: { startPoint: "asc" },
            },
            tags: {
              orderBy: { name: "asc" },
            },
          },
        }),
      ])
    : [[], [], []];

  return {
    journeys,
    selectedJourney,
    epics,
    stories,
    altitudeInfos,
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
    const { saveEpicBackgroundImage, deleteManagedEpicBackgroundImage } = await import("../features/admin/domain/epicBackgroundImage.server");
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
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

    let backgroundImage: string | null = null;
    const backgroundPatternConfig = parsePatternConfig(formData);

    try {
      backgroundImage = await saveEpicBackgroundImage(formData.get("backgroundImageFile"), {
        fileNamePrefix: `${journeyId}-epic`,
      });

      await db.epic.create({
        data: {
          title,
          description,
          color: primaryColorFromBackground(parsedBackground.background),
          background: serializeBackground(parsedBackground.background),
          backgroundImage,
          backgroundPatternConfig: backgroundPatternConfig ?? undefined,
          journeyId,
          startPoint,
          endPoint,
        },
      });
      return redirect(`/admin/${journeyId}/epics?success=Epic+created`);
    } catch (error) {
      if (backgroundImage) {
        await deleteManagedEpicBackgroundImage(backgroundImage);
      }

      if (error instanceof Error) {
        return { error: error.message };
      }

      return { error: "Unable to create epic." };
    }
  }

  if (intent === "delete") {
    const { deleteManagedEpicBackgroundImage } = await import("../features/admin/domain/epicBackgroundImage.server");
    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return { error: "Epic id is required." };
    }

    try {
      const existingEpic = await db.epic.findUnique({ where: { id } });
      await db.epic.delete({ where: { id } });
      await deleteManagedEpicBackgroundImage(existingEpic?.backgroundImage);
      return redirect(`/admin/${journeyId}/epics?success=Epic+deleted`);
    } catch {
      return { error: "Unable to delete epic." };
    }
  }

  if (intent === "import-json") {
    try {
      const raw = await readImportJsonSource(formData);
      const parsed = normalizeImportPayload(JSON.parse(raw));

      await db.$transaction(async (tx) => {
        for (const altitudeInfo of parsed.altitudeInfos) {
          await tx.altitudeInfo.create({
            data: {
              title: altitudeInfo.title,
              icon: altitudeInfo.icon,
              order: altitudeInfo.order,
              journeyId,
              values: {
                create: altitudeInfo.values.map((valueBand) => ({
                  value: valueBand.value,
                  startPoint: valueBand.startPoint,
                  endPoint: valueBand.endPoint,
                })),
              },
              ...(altitudeInfo.tags.length > 0 && {
                tags: {
                  connectOrCreate: altitudeInfo.tags.map((name) => ({
                    where: { name },
                    create: { name, journeyId },
                  })),
                },
              }),
            },
          });
        }

        for (const epic of parsed.epics) {
          await tx.epic.create({
            data: {
              title: epic.title,
              color: epic.color,
              background: epic.background,
              backgroundImage: epic.backgroundImage,
              backgroundPatternConfig: epic.backgroundPatternConfig ?? undefined,
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
              ...(story.tags.length > 0 && {
                tags: {
                  connectOrCreate: story.tags.map((name) => ({
                    where: { name },
                    create: { name, journeyId },
                  })),
                },
              }),
            },
          });
        }
      });

      const successText = encodeURIComponent(
        `Imported ${parsed.altitudeInfos.length} altitude info series, ${parsed.epics.length} epics, and ${parsed.stories.length} stories`,
      );
      return redirect(`/admin/${journeyId}/epics?success=${successText}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import JSON.";
      return { error: message };
    }
  }

  return { error: "Invalid action." };
}

const AdminEpicsRoute = () => {
  const { selectedJourney, epics, stories, altitudeInfos, success } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const actionData = useActionData() as ActionData | undefined;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);
  const [includeStoriesInAllEpicsExport, setIncludeStoriesInAllEpicsExport] = useState(true);
  const [allEpicsCopyState, setAllEpicsCopyState] = useState<"idle" | "done" | "error">("idle");
  const [allEpicsPromptCopyState, setAllEpicsPromptCopyState] = useState<"idle" | "done" | "error">("idle");

  useEffect(() => {
    if (actionData?.error) {
      setOptimisticDeletedIds([]);
    }
  }, [actionData?.error]);

  const visibleEpics = useMemo(
    () => epics.filter((epic) => !optimisticDeletedIds.includes(epic.id)),
    [epics, optimisticDeletedIds],
  );
  const epicsWithImages = epics.filter((epic) => Boolean(epic.backgroundImage)).length;
  const epicsWithPatternConfig = epics.filter((epic) => Boolean(epic.backgroundPatternConfig)).length;
  const allEpicsExportJson = useMemo(() => JSON.stringify({
    exportType: "all-epics-package",
    generatedAt: new Date().toISOString(),
    includeStories: includeStoriesInAllEpicsExport,
    journey: {
      id: selectedJourney?.id ?? null,
      name: selectedJourney?.name ?? null,
      slug: selectedJourney?.slug ?? null,
      startingPoint: selectedJourney?.startingPoint ?? null,
    },
    epics,
    altitudeInfos,
    stories: includeStoriesInAllEpicsExport ? stories : [],
  }, null, 2), [altitudeInfos, epics, includeStoriesInAllEpicsExport, selectedJourney?.id, selectedJourney?.name, selectedJourney?.slug, selectedJourney?.startingPoint, stories]);
  const allEpicsExportHref = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(allEpicsExportJson)}`,
    [allEpicsExportJson],
  );
  const allEpicsExplainPrompt = useMemo(() => [
    "You are an expert journey-data analyst.",
    "Explain this exported epics package in plain language for editors.",
    "",
    "Please cover:",
    "1. What this export contains overall.",
    "2. What each epic means and its key properties (title, range, background choices).",
    "3. How altitude info relates to the epics.",
    "4. If stories are present, summarize how they map to epics.",
    "5. Any obvious data quality checks or anomalies.",
    "",
    "Export JSON:",
    allEpicsExportJson,
  ].join("\n"), [allEpicsExportJson]);

  const handleCopyAllEpicsJson = async () => {
    try {
      await navigator.clipboard.writeText(allEpicsExportJson);
      setAllEpicsCopyState("done");
      window.setTimeout(() => setAllEpicsCopyState("idle"), 1600);
    } catch {
      setAllEpicsCopyState("error");
      window.setTimeout(() => setAllEpicsCopyState("idle"), 2000);
    }
  };

  const handleCopyAllEpicsPrompt = async () => {
    try {
      await navigator.clipboard.writeText(allEpicsExplainPrompt);
      setAllEpicsPromptCopyState("done");
      window.setTimeout(() => setAllEpicsPromptCopyState("idle"), 1600);
    } catch {
      setAllEpicsPromptCopyState("error");
      window.setTimeout(() => setAllEpicsPromptCopyState("idle"), 2000);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Epics"
        title="Define the major vertical bands"
      />

      <AdminSection
        title="Export all epics JSON"
        description="Download one package containing all epics, plus altitude info and optionally stories."
      >
        <Stack>
          <Checkbox
            checked={includeStoriesInAllEpicsExport}
            onChange={(event) => setIncludeStoriesInAllEpicsExport(event.currentTarget.checked)}
            label="Include stories in export"
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={handleCopyAllEpicsJson}>
              {allEpicsCopyState === "done" ? "Copied" : allEpicsCopyState === "error" ? "Copy failed" : "Copy JSON to clipboard"}
            </Button>
            <Button variant="default" onClick={handleCopyAllEpicsPrompt}>
              {allEpicsPromptCopyState === "done" ? "Prompt copied" : allEpicsPromptCopyState === "error" ? "Copy failed" : "Copy AI prompt"}
            </Button>
            <Button
              component="a"
              href={allEpicsExportHref}
              download={`${selectedJourney?.slug ?? "journey"}-all-epics${includeStoriesInAllEpicsExport ? "-with-stories" : ""}.json`}
              variant="light"
              color="teal"
              disabled={!selectedJourney}
            >
              Download all epics JSON
            </Button>
          </Group>
        </Stack>
      </AdminSection>

      <AdminSection
        title="Existing epics"
        description="Review and open the current epic bands first, then create a new one or import content if you need to expand the journey."
      >
        {visibleEpics.length === 0 ? (
          <Text c="dimmed">No epics for this journey yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {visibleEpics.map((epic) => {
              const overlappingCount = stories.filter(
                (story) => story.startPoint <= epic.endPoint && story.endPoint >= epic.startPoint,
              ).length;

              return (
                <Paper
                  key={epic.id}
                  radius="22px"
                  p="lg"
                  style={{
                    border: "1px solid rgba(111, 134, 145, 0.14)",
                    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 251, 0.94) 100%)",
                  }}
                >
                  <Stack gap="sm">
                    <Text fw={700} size="lg">{epic.title}</Text>
                    <Text size="sm" c="dimmed">
                      {epic.startPoint} - {epic.endPoint} · {overlappingCount} overlapping stor{overlappingCount === 1 ? "y" : "ies"}
                    </Text>
                    <div
                      style={{
                        width: "100%",
                        height: 18,
                        borderRadius: 999,
                        border: "1px solid rgba(120, 120, 120, 0.32)",
                        background: backgroundToCss(parseStoredBackground(epic.background, epic.color)),
                      }}
                    />
                    {epic.description ? (
                      <Text size="sm">{epic.description}</Text>
                    ) : (
                      <Text size="sm" c="dimmed">No description yet.</Text>
                    )}

                    <Group gap="xs">
                      <Button component={Link} to={`/admin/${selectedJourney?.id ?? ""}/epics/${epic.id}`} size="sm">
                        Open epic
                      </Button>
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
                            <Button size="sm" color="red" type="submit" name="intent" value="delete">
                              Confirm delete
                            </Button>
                          </Form>
                          <Button size="sm" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                        </Group>
                      ) : (
                        <Button size="sm" color="red" variant="subtle" onClick={() => setConfirmDeleteId(epic.id)}>
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
        title="Bulk import altitude info, epics, and stories"
        description="Use JSON import when the journey content already exists in a structured format and should be loaded in one pass."
      >
        <Form method="post" encType="multipart/form-data" key={success ?? "import-form"}>
          <Stack>
            <Group gap="xs">
              <Button component="a" href="/admin-import/altitude-info.schema.json" download variant="light" size="xs">
                Download altitude info schema
              </Button>
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
            <Textarea
              label="Paste JSON"
              name="jsonText"
              placeholder='{"altitudeInfos": [...], "epics": [...], "stories": [...]}'
              description="Optional. If JSON is pasted here, it will be imported instead of the uploaded file."
              autosize
              minRows={8}
              maxRows={18}
              spellCheck={false}
              styles={{ input: { fontFamily: "monospace" } }}
            />
            <Text size="xs" c="dimmed" ta="center">or</Text>
            <label htmlFor="jsonFileUpload">JSON file</label>
            <input id="jsonFileUpload" name="jsonFile" type="file" accept="application/json,.json" />
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="import-json" disabled={!selectedJourney} color="teal">
                Import JSON into this journey
              </Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <AdminSection
        title="Create epic"
        description="Define the title, altitude range, background, and optional repeated background art for a new epic band."
      >
        <Form method="post" encType="multipart/form-data">
          <Stack>
            {selectedJourney ? <Text size="sm" c="dimmed">Journey: {selectedJourney.name}</Text> : null}
            <TextInput label="Title" name="title" required />
            <Textarea
              label="Description"
              name="description"
              placeholder="Describe this epic layer..."
              minRows={3}
              maxRows={6}
            />
            <BackgroundField
              name="background"
              label="Background"
              defaultValue={serializeBackground({ mode: "color", color: "#4ecdc4" })}
              defaultColor="#4ecdc4"
            />
            <label htmlFor="createEpicBackgroundImageFile">Repeating background image</label>
            <input
              id="createEpicBackgroundImageFile"
              name="backgroundImageFile"
              type="file"
              accept={EPIC_BACKGROUND_IMAGE_ACCEPT}
            />
            <Text size="xs" c="dimmed">
              Optional. Upload a transparent PNG, WebP, or SVG up to {Math.round(EPIC_BACKGROUND_IMAGE_MAX_BYTES / (1024 * 1024))} MB.
              The image will repeat through the epic and scroll with the journey.
            </Text>

            <Divider label="Background pattern (optional)" labelPosition="center" my="xs" />
            <Text size="xs" c="dimmed">Controls how the background image scatters across the epic band.</Text>

            <Group grow>
              <NumberInput
                label="Density"
                name="patternDensity"
                description="How tightly packed (0=sparse, 1=dense)"
                min={0}
                max={1}
                step={0.05}
                defaultValue={0.5}
                decimalScale={2}
                fixedDecimalScale
              />
            </Group>

            <Group grow>
              <NumberInput
                label="Min scale"
                name="patternMinScale"
                description="Smallest sprite size multiplier"
                min={0.1}
                max={3}
                step={0.05}
                defaultValue={0.55}
                decimalScale={2}
                fixedDecimalScale
              />
              <NumberInput
                label="Max scale"
                name="patternMaxScale"
                description="Largest sprite size multiplier"
                min={0.1}
                max={3}
                step={0.05}
                defaultValue={1.2}
                decimalScale={2}
                fixedDecimalScale
              />
            </Group>

            <Group grow>
              <NumberInput
                label="Min horizontal spread"
                name="patternMinXRatio"
                description="Left edge (0=far left, 1=far right)"
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.12}
                decimalScale={2}
                fixedDecimalScale
              />
              <NumberInput
                label="Max horizontal spread"
                name="patternMaxXRatio"
                description="Right edge (0=far left, 1=far right)"
                min={0}
                max={1}
                step={0.02}
                defaultValue={0.88}
                decimalScale={2}
                fixedDecimalScale
              />
            </Group>

            <Group grow>
              <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue="0" min={0} />
              <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue="100" min={0} />
            </Group>
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="create" disabled={!selectedJourney}>Create epic</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <AdminActionStatus success={success} error={actionData?.error} />
    </AdminPage>
  );
};

export default AdminEpicsRoute;
