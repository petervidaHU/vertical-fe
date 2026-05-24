import { Alert, Button, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { Form, Link, useActionData, useOutletContext, useParams } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
import StoryExtraContentEditor from "../features/admin/components/StoryExtraContentEditor";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import { serializeBackground, tryParseBackgroundInput } from "../shared/domain/background";
import { parseStoryExtraContent } from "../shared/validation/storySchemas";
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

  const formData = await request.formData();
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

  if (!title || Number.isNaN(startPoint) || Number.isNaN(endPoint)) {
    return { error: "Title, start, and end are required." };
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

  await db.story.update({
    where: { id: params.storyId },
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
      journeyId: params.journeyId,
      startPoint,
      endPoint,
    },
  });

  return { success: "Story updated." };
}

const AdminJourneyStoryEditorRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const { storyId } = useParams();
  const actionData = useActionData() as ActionData | undefined;
  const story = journey.stories.find((item) => item.id === storyId);
  const [storyType, setStoryType] = useState<StoryTypeValue>((story?.storyType as StoryTypeValue) ?? "CARD");

  useEffect(() => {
    if (story) {
      setStoryType(story.storyType as StoryTypeValue);
    }
  }, [story]);

  if (!story) {
    return <Alert color="red">Story not found in this journey.</Alert>;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Edit Story</Title>
        <Button component={Link} to={`/admin/${journey.id}`} variant="subtle" size="xs">
          Back to journey
        </Button>
      </Group>

      <Card withBorder>
        <Form method="post" key={story.id}>
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

            {storyType === "CARD" ? (
              <>
                <TextInput label="Card image URL (mock for now)" name="imageUrl" defaultValue={story.imageUrl ?? ""} />
                <BackgroundField
                  name="background"
                  label="Card background"
                  defaultValue={story.background}
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
                <TextInput label="Line color" name="lineColor" defaultValue={story.lineColor} />
                <TextInput label="Line width" name="lineWidth" type="number" inputMode="numeric" defaultValue={String(story.lineWidth)} min={1} max={64} />
                <TextInput label="Line label" name="lineLabel" defaultValue={story.lineLabel} />
                <TextInput label="Tooltip text" name="tooltipText" defaultValue={story.tooltipText} />
                <TextInput label="Tooltip image URL (mock)" name="tooltipImageUrl" defaultValue={story.tooltipImageUrl ?? ""} />
                <input type="hidden" name="imageUrl" value="" />
                <input type="hidden" name="background" value={story.background || serializeBackground({ mode: "color", color: "#ffd8a8" })} />
              </>
            )}

            <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue={String(story.startPoint)} min={0} />
            <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue={String(story.endPoint)} min={0} />
            <Button type="submit">Update Story</Button>
          </Stack>
        </Form>
      </Card>

      {actionData?.success ? <Alert color="green">{actionData.success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}
    </Stack>
  );
};

export default AdminJourneyStoryEditorRoute;