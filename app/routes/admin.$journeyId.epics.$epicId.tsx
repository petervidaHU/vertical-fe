import { Alert, Button, Card, Group, Stack, Text, TextInput, Title } from "@mantine/core";
import { Form, Link, useActionData, useOutletContext, useParams } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
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

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
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

  await db.epic.update({
    where: { id: params.epicId },
    data: {
      title,
      color: primaryColorFromBackground(parsedBackground.background),
      background: serializeBackground(parsedBackground.background),
      journeyId: params.journeyId,
      startPoint,
      endPoint,
    },
  });

  return { success: "Epic updated." };
}

const AdminJourneyEpicEditorRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const { epicId } = useParams();
  const actionData = useActionData() as ActionData | undefined;
  const epic = journey.epics.find((item) => item.id === epicId);
  const overlappingStories = epic
    ? journey.stories.filter(
      (story) => story.startPoint <= epic.endPoint && story.endPoint >= epic.startPoint,
    )
    : [];

  if (!epic) {
    return <Alert color="red">Epic not found in this journey.</Alert>;
  }

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={3}>Edit Epic</Title>
        <Button component={Link} to={`/admin/${journey.id}`} variant="subtle" size="xs">
          Back to journey
        </Button>
      </Group>

      <Card withBorder>
        <Form method="post" key={epic.id}>
          <Stack>
            <Text size="sm" c="dimmed">Journey: {journey.name}</Text>
            <TextInput label="Title" name="title" required defaultValue={epic.title} />
            <BackgroundField
              name="background"
              label="Background"
              defaultValue={epic.background}
              defaultColor={epic.color}
            />
            <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue={String(epic.startPoint)} min={0} />
            <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue={String(epic.endPoint)} min={0} />
            <Button type="submit">Update Epic</Button>
          </Stack>
        </Form>
      </Card>

      <Card withBorder>
        <Stack gap="xs">
          <Title order={5}>Overlapping Stories</Title>
          {overlappingStories.length === 0 ? (
            <Text size="sm" c="dimmed">No stories overlap this epic.</Text>
          ) : (
            overlappingStories.map((story) => (
              <Group key={story.id} justify="space-between" align="center">
                <div>
                  <Text size="sm" fw={600}>{story.title}</Text>
                  <Text size="xs" c="dimmed">
                    {story.storyType} • {story.startPoint} - {story.endPoint}
                  </Text>
                </div>
                <Button component={Link} to={`/admin/${journey.id}/stories/${story.id}`} variant="subtle" size="xs">
                  Open story
                </Button>
              </Group>
            ))
          )}
        </Stack>
      </Card>

      {actionData?.success ? <Alert color="green">{actionData.success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}
    </Stack>
  );
};

export default AdminJourneyEpicEditorRoute;