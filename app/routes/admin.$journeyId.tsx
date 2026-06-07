import { Badge, Button, Group, NavLink, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { useMemo } from "react";
import { Link, Outlet, useLoaderData, useLocation, useParams } from "react-router";
import AdminJourneyMapPreviewClient from "../features/admin/components/AdminJourneyMapPreviewClient";
import { AdminPage, AdminPageHeader, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import { db } from "../server/db";

export async function loader({ params }: { params: { journeyId?: string } }) {
  if (!params.journeyId) {
    throw new Response("Missing journey id", { status: 400 });
  }

  const journey = await db.journey.findUnique({
    where: { id: params.journeyId },
    include: {
      altitudeInfos: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: {
          values: {
            orderBy: { startPoint: "asc" },
          },
          tags: {
            orderBy: { name: "asc" },
          },
        },
      },
      epics: {
        orderBy: { startPoint: "asc" },
      },
      stories: {
        orderBy: { startPoint: "asc" },
        include: {
          tags: {
            orderBy: { name: "asc" },
          },
        },
      },
      tags: {
        orderBy: { name: "asc" },
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
  const location = useLocation();
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
  const isOverviewRoute = location.pathname === `/admin/${journey.id}`;

  const workspaceSections = [
    {
      label: "Overview",
      description: "Journey settings, bulk import, and a quick inventory of existing content.",
      to: `/admin/${journey.id}`,
      count: null,
      matches: (pathname: string) => pathname === `/admin/${journey.id}`,
    },
    {
      label: "Altitude info",
      description: "Create data series and edit the value bands used by the journey indicators.",
      to: `/admin/${journey.id}/altitude-info`,
      count: journey.altitudeInfos.length,
      matches: (pathname: string) => pathname.startsWith(`/admin/${journey.id}/altitude-info`),
    },
    {
      label: "Epics",
      description: "Define the major altitude bands and their visual background treatment.",
      to: `/admin/${journey.id}/epics`,
      count: journey.epics.length,
      matches: (pathname: string) => pathname.startsWith(`/admin/${journey.id}/epics`),
    },
    {
      label: "Stories",
      description: "Create cards and line events, then refine how they appear in the timeline.",
      to: `/admin/${journey.id}/stories`,
      count: journey.stories.length,
      matches: (pathname: string) => pathname.startsWith(`/admin/${journey.id}/stories`),
    },
    {
      label: "Tags",
      description: "Manage shared journey tags used for stories, altitude info, and filtering.",
      to: `/admin/${journey.id}/tags`,
      count: journey.tags?.length ?? 0,
      matches: (pathname: string) => pathname.startsWith(`/admin/${journey.id}/tags`),
    },
  ] as const;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Journey workspace"
        title={journey.name}
        description={isOverviewRoute
          ? "The journey map stays alongside the editor so altitude ranges, overlaps, and content volume remain obvious while you work."
          : "Use the section switcher below to move directly between overview, altitude info, epics, stories, and tags without repeating the full journey summary on every page."}
        badge={journey.slug}
        breadcrumbs={[
          { label: "Admin", to: "/admin" },
          { label: "Journeys", to: "/admin/journeys" },
          { label: journey.name },
        ]}
        actions={(
          <>
            <Button component={Link} to="/admin/journeys" variant="default">
              Back to journeys
            </Button>
            <Button component={Link} to={`/journey/${journey.id}`} variant="light" color="teal">
              Preview live journey
            </Button>
          </>
        )}
      />

      <AdminSection
        title={isOverviewRoute ? "Workspace sections" : "Section switcher"}
        description={isOverviewRoute
          ? "Every journey workflow is grouped into one of these sections so it is always obvious where to add, review, or refine content."
          : "Jump straight to the relevant journey section without carrying the full summary, stats, and map into every page."}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {workspaceSections.map((section) => {
            const isActive = section.matches(location.pathname);

            return (
              <NavLink
                key={section.to}
                component={Link}
                to={section.to}
                label={section.label}
                description={section.description}
                active={isActive}
                variant="filled"
                color="teal"
                autoContrast
                rightSection={section.count === null ? null : <Badge variant={isActive ? "filled" : "light"}>{section.count}</Badge>}
                styles={{
                  root: {
                    minHeight: isOverviewRoute ? 96 : 84,
                    borderRadius: 18,
                    background: isActive
                      ? "linear-gradient(135deg, rgba(194, 242, 221, 0.96) 0%, rgba(160, 230, 214, 0.92) 100%)"
                      : "linear-gradient(180deg, rgba(248, 251, 252, 0.98) 0%, rgba(242, 247, 248, 0.94) 100%)",
                    border: isActive
                      ? "1px solid rgba(191, 239, 220, 0.98)"
                      : "1px solid rgba(111, 134, 145, 0.14)",
                    boxShadow: isActive ? "0 18px 40px rgba(25, 74, 79, 0.12)" : "none",
                  },
                  label: {
                    fontWeight: 700,
                  },
                  description: {
                    color: isActive ? "#214241" : undefined,
                  },
                }}
              />
            );
          })}
        </div>
      </AdminSection>

      {isOverviewRoute ? (
        <>
          <AdminStatGrid>
            <AdminStatCard
              label="Journey start"
              value={journey.startingPoint ? "Configured" : "Unset"}
              description="Ground styling used at the base of the timeline."
            />
            <AdminStatCard
              label="Altitude info"
              value={journey.altitudeInfos.length}
              description="Indicator series currently attached to this journey."
            />
            <AdminStatCard
              label="Epics and stories"
              value={`${journey.epics.length} / ${journey.stories.length}`}
              description="Major bands and individual content moments in the timeline."
            />
            <AdminStatCard
              label="Tags"
              value={journey.tags?.length ?? 0}
              description="Shared labels available to altitude info and stories."
            />
          </AdminStatGrid>

          <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md" verticalSpacing="md">
            <div>
              <Stack gap="md">
                <AdminSection
                  title="Journey map"
                  description="Use the map to see band ranges, jump into overlapping stories, and keep the vertical structure in view."
                >
                  <AdminJourneyMapPreviewClient
                    journeyName={journey.name}
                    startGround={journey.startingPoint}
                    epics={journey.epics}
                    stories={journey.stories}
                    height={660}
                    getEpicHref={(currentEpicId) => `/admin/${journey.id}/epics/${currentEpicId}`}
                    getStoryHref={(currentStoryId) => `/admin/${journey.id}/stories/${currentStoryId}`}
                    selectedEpicId={epicId ?? null}
                    selectedStoryId={storyId ?? null}
                    highlightedStoryIds={overlappingStoryIds}
                  />
                </AdminSection>

                <Paper
                  radius="24px"
                  p="lg"
                  style={{
                    background: "linear-gradient(180deg, rgba(12, 58, 69, 0.98) 0%, rgba(33, 91, 99, 0.95) 100%)",
                    color: "white",
                    border: "1px solid rgba(124, 208, 189, 0.16)",
                  }}
                >
                  <Stack gap={6}>
                    <Text size="xs" tt="uppercase" fw={800} c="teal.1" style={{ letterSpacing: "0.12em" }}>
                      Editing guide
                    </Text>
                    <Text fw={700}>Start broad, then go precise.</Text>
                    <Text size="sm" c="rgba(231, 240, 242, 0.74)">
                      Overview is for scope, list pages are for inventory, and detail pages are for careful edits with the map still nearby.
                    </Text>
                  </Stack>
                </Paper>
              </Stack>
            </div>

            <Outlet context={{ journey } satisfies AdminJourneyOutletContext} />
          </SimpleGrid>
        </>
      ) : (
        <Outlet context={{ journey } satisfies AdminJourneyOutletContext} />
      )}
    </AdminPage>
  );
};

export default AdminJourneyLayoutRoute;