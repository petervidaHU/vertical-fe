import { Alert, Button, Card, Group, Stack, Table, Text, TextInput, Title } from "@mantine/core";
import { db } from "../server/db";
import { Form, Link, redirect, useActionData, useLoaderData } from "react-router";
import { useEffect, useMemo, useState } from "react";
import BackgroundField from "../features/admin/components/BackgroundField";
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

  return (
    <Stack>
      <Title order={3}>Journeys</Title>

      <Card withBorder>
        <Form method="post">
          <Stack>
            <Title order={4}>Create journey</Title>
            <TextInput label="Name" name="name" required placeholder="Mountain Launch" />
            <TextInput label="Slug" name="slug" required placeholder="mountain-launch" />
            <BackgroundField
              name="startingPoint"
              label="Journey start ground"
              defaultValue={serializeBackground({ mode: "color", color: "#4b3726" })}
              defaultColor="#4b3726"
            />
            <Button type="submit" name="intent" value="create">Create Journey</Button>
          </Stack>
        </Form>
      </Card>

      {success ? <Alert color="green">{success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <Card withBorder>
        <Stack>
          <Title order={4}>Existing journeys</Title>
          {visibleJourneys.length === 0 ? (
            <Text c="dimmed">No journeys yet.</Text>
          ) : (
            <Table striped withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Slug</Table.Th>
                  <Table.Th>Starting point</Table.Th>
                  <Table.Th>Epics</Table.Th>
                  <Table.Th>Stories</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visibleJourneys.map((journey) => (
                  <Table.Tr key={journey.id}>
                    <Table.Td>{journey.name}</Table.Td>
                    <Table.Td>{journey.slug}</Table.Td>
                    <Table.Td>
                      <div
                        style={{
                          width: 56,
                          height: 10,
                          borderRadius: 2,
                          border: "1px solid rgba(120, 120, 120, 0.5)",
                          background: backgroundToCss(parseStoredBackground(journey.startingPoint, "#4b3726")),
                        }}
                      />
                    </Table.Td>
                    <Table.Td>{journey._count.epics}</Table.Td>
                    <Table.Td>{journey._count.stories}</Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Link to={`/admin/${journey.id}`}>Edit</Link>
                        <Link to={`/admin/${journey.id}/epics`}>Epics</Link>
                        <Link to={`/admin/${journey.id}/stories`}>Stories</Link>
                        {confirmDeleteId === journey.id ? (
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
                                Confirm
                              </Button>
                            </Form>
                            <Button size="xs" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                              Cancel
                            </Button>
                          </Group>
                        ) : (
                          <Button
                            size="xs"
                            color="red"
                            variant="light"
                            onClick={() => setConfirmDeleteId(journey.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </Group>
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

export default AdminJourneysRoute;
