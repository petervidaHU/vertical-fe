import { Outlet, useLoaderData } from "react-router";
import { AdminPage } from "../features/admin/components/AdminScaffold";
import { db } from "../server/db";

export async function loader({ params }: { params: { journeyId?: string } }) {
  if (!params.journeyId) {
    throw new Response("Missing journey id", { status: 400 });
  }

  const journey = await db.journey.findUnique({
    where: { id: params.journeyId },
    include: {
      translations: true,
      altitudeInfos: {
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: {
          translations: true,
          values: {
            orderBy: { startPoint: "asc" },
            include: { translations: true },
          },
          tags: {
            orderBy: { name: "asc" },
          },
        },
      },
      epics: {
        orderBy: { startPoint: "asc" },
        include: { translations: true },
      },
      stories: {
        orderBy: { startPoint: "asc" },
        include: {
          translations: true,
          tags: {
            orderBy: { name: "asc" },
          },
        },
      },
      tags: {
        orderBy: { name: "asc" },
        include: { translations: true },
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

  return (
    <AdminPage>
      <Outlet context={{ journey } satisfies AdminJourneyOutletContext} />
    </AdminPage>
  );
};

export default AdminJourneyLayoutRoute;
