import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import { Form, Link, redirect, useActionData, useOutletContext } from "react-router";
import { ALTITUDE_INFO_ICON_OPTIONS, normalizeAltitudeInfoIcon, resolveAltitudeInfoIconSymbol } from "../features/altitude-info/domain/altitudeInfo";
import { AdminPage, AdminPageHeader, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import { db } from "../server/db";

type ActionData = { error?: string };

function parseOrder(value: FormDataEntryValue | null): number {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { journeyId?: string };
}): Promise<Response | ActionData> {
  if (!params.journeyId) {
    return { error: "Missing journey id." };
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");

  if (intent === "create-series") {
    const title = String(formData.get("title") ?? "").trim();
    const icon = normalizeAltitudeInfoIcon(String(formData.get("icon") ?? "info"));
    const order = parseOrder(formData.get("order"));

    if (!title) {
      return { error: "Title is required." };
    }

    const created = await db.altitudeInfo.create({
      data: {
        title,
        icon,
        order,
        journeyId: params.journeyId,
      },
    });

    return redirect(`/admin/${params.journeyId}/altitude-info/${created.id}`);
  }

  if (intent === "delete-series") {
    const id = String(formData.get("id") ?? "").trim();

    if (!id) {
      return { error: "Altitude info id is required." };
    }

    const existing = await db.altitudeInfo.findUnique({ where: { id } });
    if (!existing || existing.journeyId !== params.journeyId) {
      return { error: "Altitude info not found." };
    }

    await db.altitudeInfo.delete({ where: { id } });
    return redirect(`/admin/${params.journeyId}/altitude-info`);
  }

  return { error: "Invalid action." };
}

const AdminAltitudeInfoRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const actionData = useActionData() as ActionData | undefined;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const altitudeInfos = useMemo(
    () => [...journey.altitudeInfos].sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.title.localeCompare(right.title);
    }),
    [journey.altitudeInfos],
  );
  const totalValueBands = altitudeInfos.reduce((sum, item) => sum + item.values.length, 0);

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Altitude info"
        title="Manage indicator series for this journey"
        description="Create the series here, then open a detail screen to add or refine the altitude value bands within that series."
        actions={(
          <Button component={Link} to={`/admin/${journey.id}`} variant="default">
            Back to overview
          </Button>
        )}
      />

      <AdminStatGrid>
        <AdminStatCard label="Series" value={altitudeInfos.length} description="Independent indicator tracks attached to this journey." />
        <AdminStatCard label="Value bands" value={totalValueBands} description="Altitude ranges distributed across all series." />
        <AdminStatCard label="Ordered items" value={altitudeInfos.filter((item) => item.order !== 0).length} description="Series with an explicit display order set." />
        <AdminStatCard label="Unconfigured" value={altitudeInfos.filter((item) => item.values.length === 0).length} description="Series that still need their first value band." />
      </AdminStatGrid>

      <AdminSection
        title="Create altitude info series"
        description="Create the series shell first. You will add one or more non-overlapping value bands on the detail page after creation."
      >
        <Form method="post">
          <Stack>
            <TextInput label="Title" name="title" required placeholder="Temperature" />
            <label>
              Icon
              <select name="icon" defaultValue="info">
                {ALTITUDE_INFO_ICON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <TextInput label="Order" name="order" type="number" inputMode="numeric" defaultValue="0" />
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="create-series" color="blue">Create series</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <AdminSection
        title="Existing altitude info series"
        description="Each card shows how much altitude coverage the series already has and gives direct access to band-level editing."
      >
        {altitudeInfos.length === 0 ? (
          <Text c="dimmed">No altitude info series yet.</Text>
        ) : (
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
            {altitudeInfos.map((altitudeInfo) => {
              const firstValue = altitudeInfo.values[0] ?? null;
              const lastValue = altitudeInfo.values[altitudeInfo.values.length - 1] ?? null;
              const coverage = firstValue && lastValue
                ? `${firstValue.startPoint} - ${lastValue.endPoint}`
                : "No values yet";

              return (
                <Paper
                  key={altitudeInfo.id}
                  radius="22px"
                  p="lg"
                  style={{
                    border: "1px solid rgba(111, 134, 145, 0.14)",
                    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 251, 0.94) 100%)",
                  }}
                >
                  <Stack gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <div>
                        <Text size="xs" tt="uppercase" fw={800} c="blue.7" style={{ letterSpacing: "0.12em" }}>
                          Order {altitudeInfo.order}
                        </Text>
                        <Text fw={700} size="lg">{altitudeInfo.title}</Text>
                      </div>
                      <Text size="xl" aria-label={altitudeInfo.icon}>
                        {resolveAltitudeInfoIconSymbol(altitudeInfo.icon)}
                      </Text>
                    </Group>

                    <Text size="sm" c="dimmed">
                      {altitudeInfo.values.length} value band{altitudeInfo.values.length === 1 ? "" : "s"} · Coverage: {coverage}
                    </Text>

                    <Group gap="xs">
                      <Button component={Link} to={`/admin/${journey.id}/altitude-info/${altitudeInfo.id}`} size="sm" color="blue">
                        Open series
                      </Button>
                      {confirmDeleteId === altitudeInfo.id ? (
                        <>
                          <Form method="post">
                            <input type="hidden" name="id" value={altitudeInfo.id} />
                            <Button size="sm" color="red" type="submit" name="intent" value="delete-series">
                              Confirm delete
                            </Button>
                          </Form>
                          <Button size="sm" variant="subtle" onClick={() => setConfirmDeleteId(null)}>
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" color="red" variant="subtle" onClick={() => setConfirmDeleteId(altitudeInfo.id)}>
                          Delete
                        </Button>
                      )}
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        )}
      </AdminSection>
    </AdminPage>
  );
};

export default AdminAltitudeInfoRoute;