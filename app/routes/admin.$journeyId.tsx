import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { useMemo } from "react";
import { Link, Outlet, useLoaderData, useParams } from "react-router";
import AdminJourneyMapPreviewClient from "../features/admin/components/AdminJourneyMapPreviewClient";
import { db } from "../server/db";

export async function loader({ params }: { params: { journeyId?: string } }) {
  if (!params.journeyId) {
    throw new Response("Missing journey id", { status: 400 });
  }

  const journey = await db.journey.findUnique({
    where: { id: params.journeyId },
    include: {
      epics: {
        orderBy: { startPoint: "asc" },
      },
      stories: {
        orderBy: { startPoint: "asc" },
      },
    },
  });

  if (!journey) {
    throw new Response("Journey not found", { status: 404 });
  }

  return { journey };
}

export type AdminJourneyOutletContext = {
  journey: Awaited<ReturnType<typeof loader>>["journey"];
};

const AdminJourneyLayoutRoute = () => {
  const { journey } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const { epicId, storyId } = useParams();
  const overlappingStoryIds = useMemo(() => {
    if (!epicId) {
      return [] as string[];
    }

    const selectedEpic = journey.epics.find((item) => item.id === epicId);
    if (!selectedEpic) {
      return [] as string[];
    }

    return journey.stories
      .filter(
        (story) => story.startPoint <= selectedEpic.endPoint && story.endPoint >= selectedEpic.startPoint,
      )
      .map((story) => story.id);
  }, [epicId, journey.epics, journey.stories]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "144px minmax(0, 1fr)", gap: 16, alignItems: "start" }}>
      <AdminJourneyMapPreviewClient
        journeyName={journey.name}
        startGround={journey.startingPoint}
        epics={journey.epics}
        stories={journey.stories}
        getEpicHref={(currentEpicId) => `/admin/${journey.id}/epics/${currentEpicId}`}
        getStoryHref={(currentStoryId) => `/admin/${journey.id}/stories/${currentStoryId}`}
        selectedEpicId={epicId ?? null}
        selectedStoryId={storyId ?? null}
        highlightedStoryIds={overlappingStoryIds}
      />

      <Stack>
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={3}>{journey.name}</Title>
            <Text size="sm" c="dimmed">
              One shared journey map for all epic and story editing.
            </Text>
          </div>
          <Group gap="xs">
            <Button component={Link} to="/admin/journeys" variant="subtle" size="xs">
              Back to journeys
            </Button>
            <Button component={Link} to={`/admin/${journey.id}/epics`} variant="light" size="xs">
              Create or delete epics
            </Button>
            <Button component={Link} to={`/admin/${journey.id}/stories`} variant="light" color="teal" size="xs">
              Create or delete stories
            </Button>
          </Group>
        </Group>

        <Outlet context={{ journey } satisfies AdminJourneyOutletContext} />
      </Stack>
    </div>
  );
};

export default AdminJourneyLayoutRoute;