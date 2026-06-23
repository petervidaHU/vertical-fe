import { Badge, Button, Group, NavLink, Paper } from "@mantine/core";
import { Link, Outlet, useLoaderData, useLocation } from "react-router";
import { AdminPage, AdminPageHeader } from "../features/admin/components/AdminScaffold";
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

  const workspaceSections = [
    {
      label: "Overview",
      to: `/admin/${journey.id}`,
      count: null,
      matches: (pathname: string) => pathname === `/admin/${journey.id}`,
    },
    {
      label: "Altitude info",
      to: `/admin/${journey.id}/altitude-info`,
      count: journey.altitudeInfos.length,
      matches: (pathname: string) => pathname.startsWith(`/admin/${journey.id}/altitude-info`),
    },
    {
      label: "Epics",
      to: `/admin/${journey.id}/epics`,
      count: journey.epics.length,
      matches: (pathname: string) => pathname.startsWith(`/admin/${journey.id}/epics`),
    },
    {
      label: "Stories",
      to: `/admin/${journey.id}/stories`,
      count: journey.stories.length,
      matches: (pathname: string) => pathname.startsWith(`/admin/${journey.id}/stories`),
    },
    {
      label: "Tags",
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
              Preview
            </Button>
          </>
        )}
      />

      <Paper
        radius="xl"
        px="sm"
        py="xs"
        style={{
          background: "linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(249, 251, 252, 0.94) 100%)",
          border: "1px solid rgba(111, 134, 145, 0.14)",
        }}
      >
        <Group gap="xs">
          {workspaceSections.map((section) => {
            const isActive = section.matches(location.pathname);

            return (
              <NavLink
                key={section.to}
                component={Link}
                to={section.to}
                label={section.label}
                active={isActive}
                variant="filled"
                color="teal"
                autoContrast
                rightSection={section.count !== null ? <Badge size="xs" variant={isActive ? "filled" : "light"}>{section.count}</Badge> : null}
                styles={{
                  root: {
                    borderRadius: 12,
                    flex: 1,
                    background: isActive
                      ? "linear-gradient(135deg, rgba(194, 242, 221, 0.96) 0%, rgba(160, 230, 214, 0.92) 100%)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(191, 239, 220, 0.98)"
                      : "1px solid transparent",
                  },
                  label: {
                    fontWeight: 700,
                    fontSize: "var(--mantine-font-size-sm)",
                  },
                }}
              />
            );
          })}
        </Group>
      </Paper>

      <Outlet context={{ journey } satisfies AdminJourneyOutletContext} />
    </AdminPage>
  );
};

export default AdminJourneyLayoutRoute;
