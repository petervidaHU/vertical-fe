import { Alert, Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { db } from "../server/db";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import BackgroundField from "../features/admin/components/BackgroundField";
import { AdminPage, AdminPageHeader, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import { backgroundToCss, parseStoredBackground, serializeBackground, tryParseBackgroundInput } from "../shared/domain/background";

type ActionData = { error?: string };

function readSuccessMessage(request: Request): string | null {
  const url = new URL(request.url);
  return url.searchParams.get("success");
}

export async function loader({ request }: { request: Request }) {
  const journeys = await db.journey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { epics: true, stories: true },
      },
    },
  });

  return {
    journeys,
    success: readSuccessMessage(request),
  };
}

export async function action({ request }: { request: Request }): Promise<Response | ActionData> {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create") {
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

    try {
      await db.journey.create({
        data: {
          name,
          slug,
          startingPoint: serializeBackground(parsedStartingPoint.background),
        },
      });
      return redirect("/admin/journeys?success=Journey+created");
    } catch {
      return { error: "Unable to create journey. Slug may already exist." };
    }
  }

  if (intent === "delete") {
    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return { error: "Journey id is required." };
    }

    try {
      await db.journey.delete({ where: { id } });
      return redirect("/admin/journeys?success=Journey+deleted");
    } catch {
      return { error: "Unable to delete journey." };
    }
  }

  return { error: "Invalid action." };
}

const AdminJourneysRoute = () => {
  const { journeys, success } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const actionData = useActionData() as ActionData | undefined;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [optimisticDeletedIds, setOptimisticDeletedIds] = useState<string[]>([]);

  useEffect(() => {
    if (actionData?.error) {
      setOptimisticDeletedIds([]);
    }
  }, [actionData?.error]);

  const visibleJourneys = useMemo(
    () => journeys.filter((journey) => !optimisticDeletedIds.includes(journey.id)),
    [journeys, optimisticDeletedIds],
  );
  const totalEpics = journeys.reduce((sum, journey) => sum + journey._count.epics, 0);
  const totalStories = journeys.reduce((sum, journey) => sum + journey._count.stories, 0);
  const emptyJourneys = journeys.filter((journey) => journey._count.epics === 0 && journey._count.stories === 0).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Journeys"
        title="Create the containers for your timelines"
        description="Every journey becomes a focused workspace where altitude info, epics, stories, and tags can be edited with the shared map in view."
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Journeys" },
        ]}
      />

      <AdminStatGrid>
        <AdminStatCard label="Journeys" value={journeys.length} description="Total editable timeline containers in the system." />
        <AdminStatCard label="Epics" value={totalEpics} description="Major vertical bands defined across all journeys." />
        <AdminStatCard label="Stories" value={totalStories} description="Cards and line events currently attached to journeys." />
        <AdminStatCard label="Empty journeys" value={emptyJourneys} description="Journeys that still need content structure." />
      </AdminStatGrid>

      <AdminSection
        title="Create a new journey"
        description="Start with a name, URL slug, and ground styling. Once created, open the journey workspace to add timeline content."
      >
        <Form method="post">
          <Stack>
            <TextInput label="Name" name="name" required placeholder="Mountain Launch" />
            <TextInput label="Slug" name="slug" required placeholder="mountain-launch" />
            <BackgroundField
              name="startingPoint"
              label="Journey start ground"
              defaultValue={serializeBackground({ mode: "color", color: "#4b3726" })}
              defaultColor="#4b3726"
            />
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="create" color="teal">Create journey</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      {success ? <Alert color="green">{success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <AdminSection
        title="Existing journeys"
        description="Open a journey workspace to edit content in context, or jump directly into epics and stories if you already know the task."
      >
        {visibleJourneys.length === 0 ? (
          <Text c="dimmed">No journeys yet.</Text>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {visibleJourneys.map((journey) => (
              <Paper
                key={journey.id}
                radius="22px"
                p="lg"
                style={{
                  border: "1px solid rgba(111, 134, 145, 0.14)",
                  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 251, 0.94) 100%)",
                }}
              >
                <Stack gap="md">
                  <Stack gap={4}>
                    <Text size="xs" tt="uppercase" fw={800} c="teal.8" style={{ letterSpacing: "0.12em" }}>
                      {journey.slug}
                    </Text>
                    <Text fw={700} size="lg">
                      {journey.name}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {journey._count.epics} epics and {journey._count.stories} stories currently attached.
                    </Text>
                  </Stack>

                  <div>
                    <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={6}>
                      Ground style
                    </Text>
                    <div
                      style={{
                        width: "100%",
                        height: 16,
                        borderRadius: 999,
                        border: "1px solid rgba(120, 120, 120, 0.32)",
                        background: backgroundToCss(parseStoredBackground(journey.startingPoint, "#4b3726")),
                      }}
                    />
                  </div>

                  <Group gap="xs">
                    <Button component={Link} to={`/admin/${journey.id}`} color="teal">
                      Open workspace
                    </Button>
                    <Button component={Link} to={`/admin/${journey.id}/epics`} variant="light">
                      Epics
                    </Button>
                    <Button component={Link} to={`/admin/${journey.id}/stories`} variant="light" color="teal">
                      Stories
                    </Button>
                  </Group>

                  {confirmDeleteId === journey.id ? (
                    <Group gap="xs" justify="space-between">
                      <Text size="sm" c="red.7">Delete this journey and all of its content?</Text>
                      <Group gap="xs">
                        <Form
                          method="post"
                          onSubmit={() => {
                            setOptimisticDeletedIds((prev) => [...prev, journey.id]);
                            setConfirmDeleteId(null);
                          }}
                        >
                          <input type="hidden" name="id" value={journey.id} />
                          <Button size="xs" color="red" type="submit" name="intent" value="delete">
                            Confirm delete
                          </Button>
                        </Form>
                        <Button size="xs" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                          Cancel
                        </Button>
                      </Group>
                    </Group>
                  ) : (
                    <Group justify="flex-end">
                      <Button size="xs" color="red" variant="subtle" onClick={() => setConfirmDeleteId(journey.id)}>
                        Delete journey
                      </Button>
                    </Group>
                  )}
                </Stack>
              </Paper>
            ))}
          </div>
        )}
      </AdminSection>
    </AdminPage>
  );
};

export default AdminJourneysRoute;
