import { Alert, Button, Group, SimpleGrid, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { Form, useActionData, useOutletContext, useParams } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
import AdminJourneyMapPreviewClient from "../features/admin/components/AdminJourneyMapPreviewClient";
import { AdminPage, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import {
  serializeBackground,
  tryParseBackgroundInput,
} from "../shared/domain/background";
import { db } from "../server/db";

type ActionData = { error?: string; success?: string };

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { journeyId?: string };
}): Promise<ActionData> {
  if (!params.journeyId) {
    return { error: "Missing journey id." };
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const startingPointInput = String(formData.get("startingPoint") ?? "").trim();

  if (!name || !slug) {
    return { error: "Name and slug are required." };
  }

  const parsedStartingPoint = tryParseBackgroundInput(startingPointInput);
  if (!parsedStartingPoint.background) {
    return { error: parsedStartingPoint.error ?? "Invalid starting point color." };
  }

  await db.journey.update({
    where: { id: params.journeyId },
    data: {
      name,
      slug,
      startingPoint: serializeBackground(parsedStartingPoint.background),
    },
  });

  return { success: "Journey updated." };
}

const AdminJourneyOverviewRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const { epicId, storyId } = useParams();
  const actionData = useActionData() as ActionData | undefined;

  return (
    <AdminPage>
      <AdminStatGrid>
        <AdminStatCard
          label="Altitude info"
          value={journey.altitudeInfos.length}
          description="Indicator series attached to this journey."
        />
        <AdminStatCard
          label="Epics"
          value={journey.epics.length}
          description="Major altitude bands defined."
        />
        <AdminStatCard
          label="Stories"
          value={journey.stories.length}
          description="Cards and line events in the timeline."
        />
        <AdminStatCard
          label="Tags"
          value={journey.tags?.length ?? 0}
          description="Shared labels for filtering."
        />
      </AdminStatGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <AdminSection title="Journey map">
          <AdminJourneyMapPreviewClient
            journeyName={journey.name}
            startGround={journey.startingPoint}
            epics={journey.epics}
            stories={journey.stories}
            height={380}
            getEpicHref={(currentEpicId) => `/admin/${journey.id}/epics/${currentEpicId}`}
            getStoryHref={(currentStoryId) => `/admin/${journey.id}/stories/${currentStoryId}`}
            selectedEpicId={epicId ?? null}
            selectedStoryId={storyId ?? null}
            highlightedStoryIds={[]}
          />
        </AdminSection>

        <Stack gap="md">
          <AdminSection title="Journey settings">
            <Form method="post">
              <Stack>
                <TextInput label="Name" name="name" required defaultValue={journey.name} />
                <TextInput label="Slug" name="slug" required defaultValue={journey.slug} />
                <BackgroundField
                  name="startingPoint"
                  label="Journey start ground"
                  defaultValue={journey.startingPoint}
                  defaultColor="#4b3726"
                />
                <Group justify="flex-end">
                  <Button type="submit">Update journey</Button>
                </Group>
              </Stack>
            </Form>
            {actionData?.success ? <Alert color="green" mt="sm">{actionData.success}</Alert> : null}
            {actionData?.error ? <Alert color="red" mt="sm">{actionData.error}</Alert> : null}
          </AdminSection>

          <AdminSection title="Import content">
            <Form method="post" action={`/admin/${journey.id}/epics`} encType="multipart/form-data">
              <Stack>
                <Group gap="xs">
                  <Button component="a" href="/admin-import/altitude-info.schema.json" download variant="light" size="xs">
                    Altitude info schema
                  </Button>
                  <Button component="a" href="/admin-import/epic.schema.json" download variant="light" size="xs">
                    Epic schema
                  </Button>
                  <Button component="a" href="/admin-import/story.schema.json" download variant="light" size="xs">
                    Story schema
                  </Button>
                  <Button component="a" href="/admin-import/journey-import.template.json" download variant="light" size="xs">
                    JSON template
                  </Button>
                  <Button component="a" href="/admin-import/ai-prompt.md" download variant="subtle" size="xs">
                    AI prompt
                  </Button>
                </Group>
                <Textarea
                  label="Paste JSON"
                  name="jsonText"
                  placeholder='{"altitudeInfos": [...], "epics": [...], "stories": [...]}'
                  autosize
                  minRows={4}
                  maxRows={12}
                  spellCheck={false}
                  styles={{ input: { fontFamily: "monospace" } }}
                />
                <Text size="xs" c="dimmed" ta="center">or</Text>
                <label htmlFor="journeyJsonFileUpload">JSON file</label>
                <input id="journeyJsonFileUpload" name="jsonFile" type="file" accept="application/json,.json" />
                <Group justify="flex-end">
                  <Button type="submit" name="intent" value="import-json" color="teal">
                    Import JSON
                  </Button>
                </Group>
              </Stack>
            </Form>
          </AdminSection>
        </Stack>
      </SimpleGrid>
    </AdminPage>
  );
};

export default AdminJourneyOverviewRoute;
