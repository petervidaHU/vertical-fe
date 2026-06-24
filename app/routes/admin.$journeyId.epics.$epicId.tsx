import { Alert, Button, Checkbox, Divider, Group, NumberInput, Paper, Stack, Text, Textarea, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import { Form, Link, useActionData, useOutletContext, useParams } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
import { EPIC_BACKGROUND_IMAGE_ACCEPT, EPIC_BACKGROUND_IMAGE_MAX_BYTES } from "../features/admin/domain/epicBackgroundImage.shared";
import { AdminActionStatus, AdminPage, AdminPageHeader, AdminSection } from "../features/admin/components/AdminScaffold";
import TranslatedFields from "../features/admin/components/TranslatedFields";
import { asTranslationDelegate, translatedFieldName, translationDefault, writeEntityTranslations } from "../features/admin/domain/translations";
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

  const intent = String(formData.get("intent") ?? "").trim();

  if (intent === "import-epic-json") {
    const jsonText = String(formData.get("importJson") ?? "").trim();
    let rawJson = jsonText;
    const jsonFileEntry = formData.get("importJsonFile");
    if (jsonFileEntry instanceof File && jsonFileEntry.size > 0) {
      rawJson = await jsonFileEntry.text();
    }
    if (!rawJson) {
      return { error: "Paste or upload a JSON file to import." };
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return { error: "Invalid JSON — could not parse." };
    }

    // Accept both the export wrapper { epic: {...} } and a bare epic object
    const epicData: Record<string, unknown> =
      parsed.epic && typeof parsed.epic === "object" && !Array.isArray(parsed.epic)
        ? (parsed.epic as Record<string, unknown>)
        : parsed;

    const updateData: {
      title?: string;
      description?: string;
      startPoint?: number;
      endPoint?: number;
      background?: string;
      color?: string;
      backgroundPatternConfig?: BackgroundPatternConfig;
    } = {};

    if (typeof epicData.title === "string" && epicData.title.trim()) {
      updateData.title = epicData.title.trim();
    }
    if (typeof epicData.description === "string") {
      updateData.description = epicData.description.trim();
    }
    if (typeof epicData.startPoint === "number") {
      updateData.startPoint = epicData.startPoint;
    }
    if (typeof epicData.endPoint === "number") {
      updateData.endPoint = epicData.endPoint;
    }
    if (epicData.background !== undefined) {
      const rawValue =
        typeof epicData.background === "string"
          ? epicData.background
          : JSON.stringify(epicData.background);
      const parsedBg = tryParseBackgroundInput(rawValue);
      if (parsedBg.background) {
        updateData.background = serializeBackground(parsedBg.background);
        updateData.color = primaryColorFromBackground(parsedBg.background);
      }
    }
    if (epicData.backgroundPatternConfig !== undefined) {
      updateData.backgroundPatternConfig =
        normalizeBackgroundPatternConfig(epicData.backgroundPatternConfig) ?? undefined;
    }

    const translations = epicData.translations;
    const hasTranslations = Array.isArray(translations) && translations.length > 0;

    if (Object.keys(updateData).length === 0 && !hasTranslations) {
      return { error: "No recognized fields found in the JSON to import." };
    }

    await db.epic.update({ where: { id: params.epicId }, data: updateData });

    if (hasTranslations) {
      for (const t of translations as Array<Record<string, unknown>>) {
        if (typeof t.locale !== "string") continue;
        await db.epicTranslation.upsert({
          where: { epicId_locale: { epicId: params.epicId, locale: t.locale } },
          create: {
            epicId: params.epicId,
            locale: t.locale,
            title: String(t.title ?? ""),
            description: String(t.description ?? ""),
          },
          update: {
            title: String(t.title ?? ""),
            description: String(t.description ?? ""),
          },
        });
      }
    }

    return { success: "Epic data imported and merged successfully." };
  }

  // Default: update epic settings
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

    await writeEntityTranslations({
      delegate: asTranslationDelegate(db.epicTranslation),
      parentKey: "epicId",
      parentId: params.epicId,
      fields: ["title", "description"],
      formData,
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

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Epic editor"
        title={epic.title}
        actions={(
          <Button component={Link} to={`/admin/${journey.id}/epics`} variant="default">
            Back to epics
          </Button>
        )}
      />

      <AdminSection title="Epic settings">
        <Form method="post" encType="multipart/form-data" key={`${epic.id}:${actionData?.success ?? "idle"}`}>
          <Stack>
            <TranslatedFields
              render={(locale, isSourceLocale) => (
                <Stack>
                  <TextInput
                    label="Title"
                    name={translatedFieldName("title", locale)}
                    required={isSourceLocale}
                    defaultValue={translationDefault(epic.title, epic.translations, "title", locale)}
                  />
                  <Textarea
                    label="Description"
                    name={translatedFieldName("description", locale)}
                    placeholder="Describe this epic layer..."
                    autosize
                    minRows={6}
                    maxRows={20}
                    defaultValue={translationDefault(epic.description, epic.translations, "description", locale)}
                  />
                </Stack>
              )}
            />

            <Divider label="Background color or gradient" labelPosition="left" mt="sm" />
            <BackgroundField
              name="background"
              label="Color or gradient"
              defaultValue={epic.background}
              defaultColor={epic.color}
            />

            <Divider label="Repeating background image" labelPosition="left" mt="sm" />
            {epic.backgroundImage ? (
              <Stack gap={6}>
                <Text size="sm" fw={600}>Current image</Text>
                <img
                  src={epic.backgroundImage}
                  alt=""
                  style={{ maxHeight: 120, maxWidth: 220, objectFit: "contain" }}
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
            <label htmlFor="epicBackgroundImageFile">Upload new image</label>
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

            <Divider label="Background image scatter pattern" labelPosition="left" mt="sm" />
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

            <Divider mt="sm" />
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

      <AdminSection title="Export epic data as JSON">
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
            <Button
              component="a"
              href={epicExportHref}
              download={`${journey.slug}-${epic.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-epic.json`}
              variant="light"
              color="teal"
            >
              Download JSON
            </Button>
          </Group>
        </Stack>
      </AdminSection>

      <AdminSection title="Import epic data from JSON">
        <Form method="post" encType="multipart/form-data">
          <Stack>
            <Text size="sm" c="dimmed">
              Paste epic JSON below or upload a file. Fields present in the imported data overwrite the matching fields on this epic — missing fields are left unchanged.
            </Text>
            <Textarea
              label="Paste JSON"
              name="importJson"
              placeholder='{ "title": "...", "startPoint": 0, "endPoint": 100, "background": "#4ecdc4" }'
              autosize
              minRows={4}
              maxRows={12}
              spellCheck={false}
              styles={{ input: { fontFamily: "monospace" } }}
            />
            <Text size="xs" c="dimmed" ta="center">or</Text>
            <label htmlFor="epicImportJsonFile">JSON file</label>
            <input id="epicImportJsonFile" name="importJsonFile" type="file" accept="application/json,.json" />
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="import-epic-json" color="teal">
                Import and merge
              </Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <AdminActionStatus success={actionData?.success} error={actionData?.error} />

      <AdminSection title="Overlapping stories">
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
