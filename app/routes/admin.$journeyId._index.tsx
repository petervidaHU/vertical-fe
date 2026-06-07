import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput, Textarea } from "@mantine/core";
import { Form, Link, useActionData, useNavigate, useOutletContext } from "react-router";
import { resolveAltitudeInfoIconSymbol } from "../features/altitude-info/domain/altitudeInfo";
import BackgroundField from "../features/admin/components/BackgroundField";
import { AdminPage, AdminPageHeader, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
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
  const navigate = useNavigate();
  const managementCards = [
    {
      label: "Altitude info",
      description: "Series and value bands used by the indicator strip.",
      countLabel: `${journey.altitudeInfos.length} series`,
      preview: journey.altitudeInfos.slice(0, 3).map((item) => item.title).join(", ") || "No series yet.",
      to: `/admin/${journey.id}/altitude-info`,
      tone: "blue",
    },
    {
      label: "Epics",
      description: "Large vertical bands that frame the journey story arc.",
      countLabel: `${journey.epics.length} epics`,
      preview: journey.epics.slice(0, 3).map((item) => item.title).join(", ") || "No epics yet.",
      to: `/admin/${journey.id}/epics`,
      tone: "teal",
    },
    {
      label: "Stories",
      description: "Cards and line events rendered inside the timeline.",
      countLabel: `${journey.stories.length} stories`,
      preview: journey.stories.slice(0, 3).map((item) => item.title).join(", ") || "No stories yet.",
      to: `/admin/${journey.id}/stories`,
      tone: "green",
    },
    {
      label: "Tags",
      description: "Shared labels for filtering and grouping timeline content.",
      countLabel: `${journey.tags?.length ?? 0} tags`,
      preview: (journey.tags ?? []).slice(0, 4).map((item) => item.name).join(", ") || "No tags yet.",
      to: `/admin/${journey.id}/tags`,
      tone: "grape",
    },
  ] as const;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Overview"
        title="Control this journey"
        description="Use overview for imports and settings, then jump into the right workflow card below to manage structured content."
        actions={(
          <>
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
          </>
        )}
      />

      <AdminStatGrid>
        <AdminStatCard label="Altitude info" value={journey.altitudeInfos.length} description="Indicator series available in this journey." />
        <AdminStatCard label="Epics" value={journey.epics.length} description="Major timeline bands already defined." />
        <AdminStatCard label="Stories" value={journey.stories.length} description="Cards and line events in the timeline." />
        <AdminStatCard label="Tags" value={journey.tags?.length ?? 0} description="Shared labels used for editing and filtering." />
      </AdminStatGrid>

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
        title="Management shortcuts"
        description="Jump straight into the next editing area without scanning long tables from the overview page."
      >
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {managementCards.map((card) => (
            <Paper
              key={card.label}
              radius="22px"
              p="lg"
              style={{
                border: "1px solid rgba(111, 134, 145, 0.14)",
                background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 251, 0.94) 100%)",
              }}
            >
              <Stack gap="sm">
                <Text size="xs" tt="uppercase" fw={800} c={`${card.tone}.7`} style={{ letterSpacing: "0.12em" }}>
                  {card.countLabel}
                </Text>
                <Text fw={700} size="lg">
                  {card.label}
                </Text>
                <Text size="sm" c="dimmed">
                  {card.description}
                </Text>
                <Text size="sm">{card.preview}</Text>
                <Group justify="space-between" align="center">
                  <Button variant="light" color={card.tone} onClick={() => navigate(card.to)}>
                    Manage {card.label.toLowerCase()}
                  </Button>
                  {card.label === "Altitude info" && journey.altitudeInfos[0] ? (
                    <Text size="xs" c="dimmed">
                      First icon: {resolveAltitudeInfoIconSymbol(journey.altitudeInfos[0].icon)}
                    </Text>
                  ) : null}
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </AdminSection>
    </AdminPage>
  );
};

export default AdminJourneyOverviewRoute;