import { Button, Card, Group, Stack, Text, Title } from "@mantine/core";
import { Link, useLoaderData } from "react-router";
import { db } from "../server/db";
import { backgroundToCss, parseStoredBackground } from "../shared/domain/background";

export async function loader() {
  const journeys = await db.journey.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          epics: true,
          stories: true,
        },
      },
    },
  });

  return { journeys };
}

export default function JourneyIndexPage() {
  const { journeys } = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <Stack p="md">
      <Title order={2}>Select Journey</Title>
      <Text c="dimmed">Choose a journey to open its timeline view.</Text>

      {journeys.length === 0 ? (
        <Card withBorder>
          <Stack>
            <Text>No journeys available yet.</Text>
            <Button component={Link} to="/admin/journeys" variant="light">
              Create your first journey
            </Button>
          </Stack>
        </Card>
      ) : (
        journeys.map((journey) => (
          <Card key={journey.id} withBorder>
            <Group justify="space-between" align="center" wrap="wrap">
              <Stack gap={4}>
                <Title order={4}>{journey.name}</Title>
                <Text c="dimmed" size="sm">/{journey.slug}</Text>
                <div
                  style={{
                    width: 64,
                    height: 10,
                    borderRadius: 2,
                    border: "1px solid rgba(120, 120, 120, 0.5)",
                    background: backgroundToCss(parseStoredBackground(journey.startingPoint, "#4b3726")),
                  }}
                />
                <Text size="sm">
                  {journey._count.epics} epics • {journey._count.stories} stories
                </Text>
              </Stack>

              <Button component={Link} to={`/journey/${journey.id}`}>
                Open Journey
              </Button>
            </Group>
          </Card>
        ))
      )}
    </Stack>
  );
}
