import { Alert, Button, Card, Group, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { Form, Link, useActionData, useOutletContext } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import {
  backgroundToCss,
  parseStoredBackground,
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
    <Stack>
      <Card withBorder>
        <Form method="post" action={`/admin/${journey.id}/epics`} encType="multipart/form-data">
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
            <label htmlFor="journeyJsonFileUpload">JSON file</label>
            <input id="journeyJsonFileUpload" name="jsonFile" type="file" accept="application/json,.json" required />
            <Button type="submit" name="intent" value="import-json">
              Import JSON into this journey
            </Button>
          </Stack>
        </Form>
      </Card>

      <Card withBorder>
        <Form method="post">
          <Stack>
            <Title order={4}>Edit Journey</Title>
            <TextInput label="Name" name="name" required defaultValue={journey.name} />
            <TextInput label="Slug" name="slug" required defaultValue={journey.slug} />
            <BackgroundField
              name="startingPoint"
              label="Journey start ground"
              defaultValue={journey.startingPoint}
              defaultColor="#4b3726"
            />
            <Button type="submit">Update Journey</Button>
          </Stack>
        </Form>
      </Card>

      {actionData?.success ? <Alert color="green">{actionData.success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <Title order={4}>Epics in Journey</Title>
            <Button component={Link} to={`/admin/${journey.id}/epics`} variant="light" size="xs">
              Manage epics
            </Button>
          </Group>
          {journey.epics.length === 0 ? (
            <Text c="dimmed">No epics yet.</Text>
          ) : (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Background</Table.Th>
                  <Table.Th>Range</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {journey.epics.map((epic) => (
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
                    <Table.Td>{epic.startPoint} - {epic.endPoint}</Table.Td>
                    <Table.Td>
                      <Link to={`/admin/${journey.id}/epics/${epic.id}`}>Edit on map</Link>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Card>

      <Card withBorder>
        <Stack>
          <Group justify="space-between">
            <Title order={4}>Stories in Journey</Title>
            <Button component={Link} to={`/admin/${journey.id}/stories`} variant="light" color="teal" size="xs">
              Manage stories
            </Button>
          </Group>
          {journey.stories.length === 0 ? (
            <Text c="dimmed">No stories yet.</Text>
          ) : (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Title</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Range</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {journey.stories.map((story) => (
                  <Table.Tr key={story.id}>
                    <Table.Td>{story.title}</Table.Td>
                    <Table.Td>{story.storyType}</Table.Td>
                    <Table.Td>{story.startPoint} - {story.endPoint}</Table.Td>
                    <Table.Td>
                      <Link to={`/admin/${journey.id}/stories/${story.id}`}>Edit on map</Link>
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

export default AdminJourneyOverviewRoute;