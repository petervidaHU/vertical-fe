import { Alert, Badge, Button, Checkbox, Group, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { Form, Link, useActionData, useOutletContext, useParams } from "react-router";
import StoryExtraContentEditor from "../features/admin/components/StoryExtraContentEditor";
import { STORY_IMAGE_ACCEPT, STORY_IMAGE_MAX_BYTES } from "../features/admin/domain/storyImage.shared";
import { AdminActionStatus, AdminPage, AdminPageHeader, AdminSection } from "../features/admin/components/AdminScaffold";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import { parseStoryExtraContent } from "../shared/validation/storySchemas";
import TagSelector from "../features/tags/admin/TagSelector";
import { TAG_SYSTEM_MAX_COUNT, type TagLike } from "../features/tags/domain/tags";
import type { TagSuggestion } from "../features/tags/admin/TagSelector";
import { resolveJourneyTagIds } from "../server/api/tags";
import { db } from "../server/db";

type ActionData = { error?: string; success?: string };
type StoryTypeValue = "CARD" | "LINE";

function parsePoint(value: FormDataEntryValue | null): number {
  return Number.parseInt(String(value ?? ""), 10);
}

function parseStoryType(value: FormDataEntryValue | null): StoryTypeValue {
  return String(value ?? "CARD").toUpperCase() === "LINE" ? "LINE" : "CARD";
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { journeyId?: string; storyId?: string };
}): Promise<ActionData> {
  if (!params.journeyId || !params.storyId) {
    return { error: "Missing journey or story id." };
  }

  const {
    deleteManagedStoryImage,
    isStoryImageClearRequested,
    saveStoryImage,
  } = await import("../features/admin/domain/storyImage.server");

  const formData = await request.formData();
  const existingStory = await db.story.findUnique({
    where: { id: params.storyId },
  });

  if (!existingStory || existingStory.journeyId !== params.journeyId) {
    return { error: "Story not found." };
  }

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
  const clearStoryImage = isStoryImageClearRequested(formData);

  if (!title || Number.isNaN(startPoint) || Number.isNaN(endPoint)) {
    return { error: "Title, start, and end are required." };
  }

  if (startPoint > endPoint) {
    return { error: "Start point must be less than or equal to end point." };
  }

  if (Number.isNaN(lineWidth) || lineWidth < 1 || lineWidth > 64) {
    return { error: "Line width must be between 1 and 64." };
  }

  // Resolve tag IDs before updating
  const tagIds = await resolveJourneyTagIds(formData, params.journeyId);

  let nextImageUrl = existingStory.imageUrl;
  let uploadedStoryImage: string | null = null;

  try {
    uploadedStoryImage = await saveStoryImage(formData.get("storyImageFile"), {
      fileNamePrefix: params.storyId,
    });

    if (uploadedStoryImage) {
      nextImageUrl = uploadedStoryImage;
    } else if (clearStoryImage) {
      nextImageUrl = null;
    }

    await db.story.update({
      where: { id: params.storyId },
      data: {
        title,
        description,
        extraContent,
        storyType,
        imageUrl: nextImageUrl,
        lineColor,
        lineWidth,
        lineLabel,
        tooltipText,
        tooltipImageUrl,
        journeyId: params.journeyId,
        startPoint,
        endPoint,
        tags: {
          set: tagIds.map((id) => ({ id })),
        },
      },
    });
  } catch (error) {
    if (uploadedStoryImage) {
      await deleteManagedStoryImage(uploadedStoryImage);
    }

    return {
      error: error instanceof Error ? error.message : "Unable to update story.",
    };
  }

  if (uploadedStoryImage && existingStory.imageUrl && existingStory.imageUrl !== uploadedStoryImage) {
    await deleteManagedStoryImage(existingStory.imageUrl);
  }

  if (!uploadedStoryImage && clearStoryImage && existingStory.imageUrl) {
    await deleteManagedStoryImage(existingStory.imageUrl);
  }

  return { success: "Story updated." };
}

const AdminJourneyStoryEditorRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const { storyId } = useParams();
  const actionData = useActionData() as ActionData | undefined;
  const story = journey.stories.find((item) => item.id === storyId);
  const [storyType, setStoryType] = useState<StoryTypeValue>((story?.storyType as StoryTypeValue) ?? "CARD");
  const [selectedTags, setSelectedTags] = useState<TagLike[]>(() =>
    (story?.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
  );
  const [storyPromptCopyState, setStoryPromptCopyState] = useState<"idle" | "done" | "error">("idle");

  const allTags: TagSuggestion[] = useMemo(
    () =>
      (journey.tags ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
    [journey.tags],
  );
  const storyExportJson = useMemo(() => JSON.stringify({
    exportType: "story",
    generatedAt: new Date().toISOString(),
    journey: {
      id: journey.id,
      name: journey.name,
      slug: journey.slug,
    },
    story,
  }, null, 2), [journey.id, journey.name, journey.slug, story]);
  const storyExportHref = useMemo(
    () => `data:application/json;charset=utf-8,${encodeURIComponent(storyExportJson)}`,
    [storyExportJson],
  );
  const storyExplainPrompt = useMemo(() => [
    "You are an expert journey-data analyst.",
    "Explain this exported story in plain language for editors.",
    "",
    "Please cover:",
    "1. What this story represents in the journey.",
    "2. Its key properties (story type, altitude range, text/media fields, visual fields, tags).",
    "3. If it is a LINE story, explain line-specific properties.",
    "4. If it is a CARD story, explain card-specific implications.",
    "5. Any potential data quality issues.",
    "",
    "Export JSON:",
    storyExportJson,
  ].join("\n"), [storyExportJson]);
  const handleCopyStoryPrompt = async () => {
    try {
      await navigator.clipboard.writeText(storyExplainPrompt);
      setStoryPromptCopyState("done");
      window.setTimeout(() => setStoryPromptCopyState("idle"), 1600);
    } catch {
      setStoryPromptCopyState("error");
      window.setTimeout(() => setStoryPromptCopyState("idle"), 2000);
    }
  };

  useEffect(() => {
    if (story) {
      setStoryType(story.storyType as StoryTypeValue);
      setSelectedTags((story.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })));
    }
  }, [story]);

  if (!story) {
    return <Alert color="red">Story not found in this journey.</Alert>;
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Story editor"
        title={`Edit ${story.title}`}
        actions={(
          <Button component={Link} to={`/admin/${journey.id}/stories`} variant="default">
            Back to stories
          </Button>
        )}
      />

      <AdminSection title="Story settings">
        <Form method="post" encType="multipart/form-data" key={story.id}>
          <Stack>
            <Text size="sm" c="dimmed">Journey: {journey.name}</Text>
            <TextInput label="Title" name="title" required defaultValue={story.title} />
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
            <TextInput label="Description" name="description" defaultValue={story.description} />
            <StoryExtraContentEditor name="extraContent" initialValue={story.extraContent} />

            {story.imageUrl ? (
              <Stack gap={6}>
                <Text size="sm" fw={600}>Current story image</Text>
                <img
                  src={story.imageUrl}
                  alt=""
                  style={{
                    maxHeight: 160,
                    maxWidth: 240,
                    objectFit: "contain",
                  }}
                />
                <Text size="xs" c="dimmed">{story.imageUrl}</Text>
                <Checkbox
                  name="removeImage"
                  value="1"
                  label="Remove the current story image"
                />
              </Stack>
            ) : (
              <Text size="xs" c="dimmed">No story image uploaded yet.</Text>
            )}
            <label htmlFor="storyImageFile">Story image</label>
            <input
              id="storyImageFile"
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
                <TextInput label="Line color" name="lineColor" defaultValue={story.lineColor} />
                <TextInput label="Line width" name="lineWidth" type="number" inputMode="numeric" defaultValue={String(story.lineWidth)} min={1} max={64} />
                <TextInput label="Line label" name="lineLabel" defaultValue={story.lineLabel} />
                <TextInput label="Tooltip text" name="tooltipText" defaultValue={story.tooltipText} />
                <TextInput label="Tooltip image URL (mock)" name="tooltipImageUrl" defaultValue={story.tooltipImageUrl ?? ""} />
              </>
            )}

            <TagSelector
              selected={selectedTags}
              allTags={allTags}
              maxTags={TAG_SYSTEM_MAX_COUNT}
              onChange={setSelectedTags}
            />

            <Group justify="space-between" align="center">
              <Badge color="teal" variant="light">
                {selectedTags.length} tag{selectedTags.length === 1 ? "" : "s"} selected
              </Badge>
              <Text size="sm" c="dimmed">
                Story will appear from {story.startPoint} to {story.endPoint} until you update the range below.
              </Text>
            </Group>

            <Group grow>
              <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue={String(story.startPoint)} min={0} />
              <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue={String(story.endPoint)} min={0} />
            </Group>
            <Group justify="flex-end">
              <Button type="submit">Update story</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <AdminSection title="Export story JSON">
        <Stack>
          <Textarea
            readOnly
            value={storyExportJson}
            autosize
            minRows={8}
            maxRows={20}
            styles={{ input: { fontFamily: "monospace" } }}
          />
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={handleCopyStoryPrompt}>
              {storyPromptCopyState === "done" ? "Prompt copied" : storyPromptCopyState === "error" ? "Copy failed" : "Copy AI prompt"}
            </Button>
            <Button
              component="a"
              href={storyExportHref}
              download={`${journey.slug}-${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.story.json`}
              variant="light"
              color="teal"
            >
              Download story JSON
            </Button>
          </Group>
        </Stack>
      </AdminSection>

      <AdminActionStatus success={actionData?.success} error={actionData?.error} />
    </AdminPage>
  );
};

export default AdminJourneyStoryEditorRoute;