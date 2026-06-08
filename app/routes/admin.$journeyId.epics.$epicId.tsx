import { Alert, Button, Checkbox, Divider, Group, NumberInput, Paper, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import { Form, Link, useActionData, useOutletContext, useParams } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
import { EPIC_BACKGROUND_IMAGE_ACCEPT, EPIC_BACKGROUND_IMAGE_MAX_BYTES } from "../features/admin/domain/epicBackgroundImage.shared";
import { AdminPage, AdminPageHeader, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import { normalizeBackgroundPatternConfig, type BackgroundPatternConfig } from "../features/timeline/pixi/layout/epicBackgroundPattern";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import {
  primaryColorFromBackground,
  serializeBackground,
  tryParseBackgroundInput,
} from "../shared/domain/background";
import { db } from "../server/db";

type ActionData = { error?: string; success?: string };

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

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { journeyId?: string; epicId?: string };
}): Promise<ActionData> {
  if (!params.journeyId || !params.epicId) {
    return { error: "Missing journey or epic id." };
  }

  const {
    deleteManagedEpicBackgroundImage,
    isEpicBackgroundImageClearRequested,
    saveEpicBackgroundImage,
  } = await import("../features/admin/domain/epicBackgroundImage.server");

  const formData = await request.formData();
  const existingEpic = await db.epic.findUnique({
    where: { id: params.epicId },
  });

  if (!existingEpic || existingEpic.journeyId !== params.journeyId) {
    return { error: "Epic not found." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const backgroundInput = String(formData.get("background") ?? "").trim();
  const startPoint = parsePoint(formData.get("startPoint"));
  const endPoint = parsePoint(formData.get("endPoint"));

  if (!title || Number.isNaN(startPoint) || Number.isNaN(endPoint)) {
    return { error: "Title, start, and end are required." };
  }

  if (startPoint > endPoint) {
    return { error: "Start point must be less than or equal to end point." };
  }

  const parsedBackground = tryParseBackgroundInput(backgroundInput);
  if (!parsedBackground.background) {
    return { error: parsedBackground.error ?? "Invalid background." };
  }

  const clearBackgroundImage = isEpicBackgroundImageClearRequested(formData);
  let nextBackgroundImage = existingEpic.backgroundImage;
  let uploadedBackgroundImage: string | null = null;
  const backgroundPatternConfig = parsePatternConfig(formData);

  try {
    uploadedBackgroundImage = await saveEpicBackgroundImage(formData.get("backgroundImageFile"), {
      fileNamePrefix: params.epicId,
    });

    if (uploadedBackgroundImage) {
      nextBackgroundImage = uploadedBackgroundImage;
    } else if (clearBackgroundImage) {
      nextBackgroundImage = null;
    }

    await db.epic.update({
      where: { id: params.epicId },
      data: {
        title,
        description,
        color: primaryColorFromBackground(parsedBackground.background),
        background: serializeBackground(parsedBackground.background),
        backgroundImage: nextBackgroundImage,
        backgroundPatternConfig: backgroundPatternConfig ?? undefined,
        journeyId: params.journeyId,
        startPoint,
        endPoint,
      },
    });
  } catch (error) {
    if (uploadedBackgroundImage) {
      await deleteManagedEpicBackgroundImage(uploadedBackgroundImage);
    }

    return {
      error: error instanceof Error ? error.message : "Unable to update epic.",
    };
  }

  if (uploadedBackgroundImage && existingEpic.backgroundImage && existingEpic.backgroundImage !== uploadedBackgroundImage) {
    await deleteManagedEpicBackgroundImage(existingEpic.backgroundImage);
  }

  if (!uploadedBackgroundImage && clearBackgroundImage && existingEpic.backgroundImage) {
    await deleteManagedEpicBackgroundImage(existingEpic.backgroundImage);
  }

  return { success: "Epic updated." };
}

const AdminJourneyEpicEditorRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const { epicId } = useParams();
  const actionData = useActionData() as ActionData | undefined;
  const [includeStoriesInEpicExport, setIncludeStoriesInEpicExport] = useState(true);
  const [epicCopyState, setEpicCopyState] = useState<"idle" | "done" | "error">("idle");
  const [epicPromptCopyState, setEpicPromptCopyState] = useState<"idle" | "done" | "error">("idle");
  const epic = journey.epics.find((item) => item.id === epicId);
  const overlappingStories = epic
    ? journey.stories.filter(
      (story) => story.startPoint <= epic.endPoint && story.endPoint >= epic.startPoint,
    )
    : [];

  if (!epic) {
    return <Alert color="red">Epic not found in this journey.</Alert>;
  }

  const patternConfig = normalizeBackgroundPatternConfig(epic.backgroundPatternConfig);
  const epicExportJson = useMemo(() => JSON.stringify({
    exportType: "epic-package",
    generatedAt: new Date().toISOString(),
    includeStories: includeStoriesInEpicExport,
    journey: {
      id: journey.id,
      name: journey.name,
      slug: journey.slug,
      startingPoint: journey.startingPoint,
    },
    epic,
    altitudeInfos: journey.altitudeInfos,
    stories: includeStoriesInEpicExport ? overlappingStories : [],
  }, null, 2), [epic, includeStoriesInEpicExport, journey.altitudeInfos, journey.id, journey.name, journey.slug, journey.startingPoint, overlappingStories]);
  const epicExportHref = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(epicExportJson)}`,
    [epicExportJson],
  );
  const epicExplainPrompt = useMemo(() => [
    "You are an expert journey-data analyst.",
    "Explain this exported epic package in plain language for editors.",
    "",
    "Please cover:",
    "1. What this epic represents in the journey.",
    "2. The key properties of the epic (range, background, image/pattern choices).",
    "3. How altitude info connects to this epic.",
    "4. If stories are included, how they overlap and relate to the epic.",
    "5. Any potential issues or inconsistencies.",
    "",
    "Export JSON:",
    epicExportJson,
  ].join("\n"), [epicExportJson]);
  const handleCopyEpicJson = async () => {
    try {
      await navigator.clipboard.writeText(epicExportJson);
      setEpicCopyState("done");
      window.setTimeout(() => setEpicCopyState("idle"), 1600);
    } catch {
      setEpicCopyState("error");
      window.setTimeout(() => setEpicCopyState("idle"), 2000);
    }
  };
  const handleCopyEpicPrompt = async () => {
    try {
      await navigator.clipboard.writeText(epicExplainPrompt);
      setEpicPromptCopyState("done");
      window.setTimeout(() => setEpicPromptCopyState("idle"), 1600);
    } catch {
      setEpicPromptCopyState("error");
      window.setTimeout(() => setEpicPromptCopyState("idle"), 2000);
    }
  };

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Epic editor"
        title={`Edit ${epic.title}`}
        description="Refine the epic range, visual background, repeated art, and pattern density while keeping overlapping stories visible below."
        actions={(
          <>
            <Button component={Link} to={`/admin/${journey.id}/epics`} variant="default">
              Back to epics
            </Button>
            <Button component={Link} to={`/admin/${journey.id}`} variant="light">
              Journey overview
            </Button>
          </>
        )}
      />

      <AdminStatGrid>
        <AdminStatCard label="Range" value={`${epic.startPoint} - ${epic.endPoint}`} description="Altitude span covered by this epic." />
        <AdminStatCard label="Overlapping stories" value={overlappingStories.length} description="Stories that intersect this epic's altitude range." />
        <AdminStatCard label="Background image" value={epic.backgroundImage ? "Attached" : "None"} description="Repeated art rendered through the epic band." />
        <AdminStatCard label="Pattern config" value={patternConfig ? "Configured" : "Default"} description="Scatter settings for repeated epic background art." />
      </AdminStatGrid>

      <AdminSection
        title="Epic settings"
        description="This is the full editing surface for one epic, including title, range, background, repeated art, and pattern behavior."
      >
        <Form method="post" encType="multipart/form-data" key={`${epic.id}:${actionData?.success ?? "idle"}`}>
          <Stack>
            <Text size="sm" c="dimmed">Journey: {journey.name}</Text>
            <TextInput label="Title" name="title" required defaultValue={epic.title} />
            <Textarea
              label="Description"
              name="description"
              placeholder="Describe this epic layer..."
              minRows={3}
              maxRows={6}
              defaultValue={epic.description}
            />
            <BackgroundField
              name="background"
              label="Background"
              defaultValue={epic.background}
              defaultColor={epic.color}
            />
            {epic.backgroundImage ? (
              <Stack gap={6}>
                <Text size="sm" fw={600}>Current repeating background image</Text>
                <img
                  src={epic.backgroundImage}
                  alt=""
                  style={{
                    maxHeight: 120,
                    maxWidth: 220,
                    objectFit: "contain",
                  }}
                />
                <Text size="xs" c="dimmed">{epic.backgroundImage}</Text>
                <Checkbox
                  name="removeBackgroundImage"
                  value="1"
                  label="Remove the current repeating background image"
                />
              </Stack>
            ) : (
              <Text size="xs" c="dimmed">No repeating background image uploaded yet.</Text>
            )}
            <label htmlFor="epicBackgroundImageFile">Repeating background image</label>
            <input
              id="epicBackgroundImageFile"
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
                defaultValue={patternConfig?.density ?? 0.5}
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
                defaultValue={patternConfig?.minScale ?? 0.55}
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
                defaultValue={patternConfig?.maxScale ?? 1.2}
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
                defaultValue={patternConfig?.minXRatio ?? 0.12}
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
                defaultValue={patternConfig?.maxXRatio ?? 0.88}
                decimalScale={2}
                fixedDecimalScale
              />
            </Group>
            <Group grow>
              <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue={String(epic.startPoint)} min={0} />
              <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue={String(epic.endPoint)} min={0} />
            </Group>
            <Group justify="flex-end">
              <Button type="submit">Update epic</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <AdminSection
        title="Export epic package JSON"
        description="Download one JSON package with this epic and altitude info, with an option to include or exclude overlapping stories."
      >
        <Stack>
          <Checkbox
            checked={includeStoriesInEpicExport}
            onChange={(event) => setIncludeStoriesInEpicExport(event.currentTarget.checked)}
            label="Include overlapping stories in export"
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={handleCopyEpicJson}>
              {epicCopyState === "done" ? "Copied" : epicCopyState === "error" ? "Copy failed" : "Copy JSON to clipboard"}
            </Button>
            <Button variant="default" onClick={handleCopyEpicPrompt}>
              {epicPromptCopyState === "done" ? "Prompt copied" : epicPromptCopyState === "error" ? "Copy failed" : "Copy AI prompt"}
            </Button>
            <Button
              component="a"
              href={epicExportHref}
              download={`${journey.slug}-${epic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-package.json`}
              variant="light"
              color="teal"
            >
              Download epic JSON
            </Button>
          </Group>
        </Stack>
      </AdminSection>

      {actionData?.success ? <Alert color="green">{actionData.success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <AdminSection
        title="Overlapping stories"
        description="These stories intersect the current epic range, which makes them the best candidates to double-check while adjusting boundaries."
      >
        {overlappingStories.length === 0 ? (
          <Text size="sm" c="dimmed">No stories overlap this epic.</Text>
        ) : (
          <Stack gap="sm">
            {overlappingStories.map((story) => (
              <Paper key={story.id} radius="18px" p="md" style={{ border: "1px solid rgba(111, 134, 145, 0.14)" }}>
                <Group justify="space-between" align="center">
                  <div>
                    <Text size="sm" fw={600}>{story.title}</Text>
                    <Text size="xs" c="dimmed">
                      {story.storyType} · {story.startPoint} - {story.endPoint}
                    </Text>
                  </div>
                  <Button component={Link} to={`/admin/${journey.id}/stories/${story.id}`} variant="light" size="sm">
                    Open story
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </AdminSection>
    </AdminPage>
  );
};

export default AdminJourneyEpicEditorRoute;