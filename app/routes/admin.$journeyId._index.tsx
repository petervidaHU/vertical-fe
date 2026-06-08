import { Alert, Button, Group, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { Form, Link, useActionData, useOutletContext } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
import { AdminPage, AdminSection } from "../features/admin/components/AdminScaffold";
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
  const actionData = useActionData() as ActionData | undefined;

  return (
    <AdminPage>
      <AdminSection
        title="Journey settings"
        description="Edit the core identity and the base ground styling for this journey."
      >
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
      </AdminSection>

      {actionData?.success ? <Alert color="green">{actionData.success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <AdminSection
        title="Import content into this journey"
        description="Bulk import altitude info, epics, and stories from JSON when you already have structured content ready to load."
      >
        <Form method="post" action={`/admin/${journey.id}/epics`} encType="multipart/form-data">
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
            <label htmlFor="journeyJsonFileUpload">JSON file</label>
            <input id="journeyJsonFileUpload" name="jsonFile" type="file" accept="application/json,.json" />
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="import-json" color="teal">
                Import JSON into this journey
              </Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <Group gap="xs">
        <Button component={Link} to={`/admin/${journey.id}/altitude-info`} variant="light" color="blue">
          Altitude info
        </Button>
        <Button component={Link} to={`/admin/${journey.id}/epics`} variant="light">
          Epics
        </Button>
        <Button component={Link} to={`/admin/${journey.id}/stories`} variant="light" color="teal">
          Stories
        </Button>
        <Button component={Link} to={`/admin/${journey.id}/tags`} variant="light" color="grape">
          Tags
        </Button>
      </Group>
    </AdminPage>
  );
};

export default AdminJourneyOverviewRoute;