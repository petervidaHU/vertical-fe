import { Alert, Button, Checkbox, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useEffect, useMemo, useState } from "react";
import { Form, Link, useActionData, useOutletContext, useParams } from "react-router";
import { ALTITUDE_INFO_ICON_OPTIONS, normalizeAltitudeInfoIcon, rangesOverlap, resolveAltitudeInfoIconSymbol } from "../features/altitude-info/domain/altitudeInfo";
import { AdminPage, AdminPageHeader, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import TagSelector from "../features/tags/admin/TagSelector";
import { TAG_SYSTEM_MAX_COUNT, type TagLike } from "../features/tags/domain/tags";
import type { TagSuggestion } from "../features/tags/admin/TagSelector";
import { resolveJourneyTagIds } from "../server/api/tags";
import { db } from "../server/db";

type ActionData = { error?: string; success?: string };

function parsePoint(value: FormDataEntryValue | null): number {
  return Number.parseInt(String(value ?? ""), 10);
}

function parseOrder(value: FormDataEntryValue | null): number {
  const parsed = Number.parseInt(String(value ?? "0"), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseFloat_(value: FormDataEntryValue | null): number | null {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { journeyId?: string; altitudeInfoId?: string };
}): Promise<ActionData> {
  if (!params.journeyId || !params.altitudeInfoId) {
    return { error: "Missing journey or altitude info id." };
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "");
  const existingAltitudeInfo = await db.altitudeInfo.findUnique({
    where: { id: params.altitudeInfoId },
    include: {
      values: {
        orderBy: { startPoint: "asc" },
      },
    },
  });

  if (!existingAltitudeInfo || existingAltitudeInfo.journeyId !== params.journeyId) {
    return { error: "Altitude info not found." };
  }

  if (intent === "update-series") {
    const title = String(formData.get("title") ?? "").trim();
    const icon = normalizeAltitudeInfoIcon(String(formData.get("icon") ?? "info"));
    const order = parseOrder(formData.get("order"));

    if (!title) {
      return { error: "Title is required." };
    }

    // Resolve tag IDs before updating
    const tagIds = await resolveJourneyTagIds(formData, params.journeyId);

    await db.altitudeInfo.update({
      where: { id: existingAltitudeInfo.id },
      data: {
        title,
        icon,
        order,
        tags: {
          set: tagIds.map((id) => ({ id })),
        },
      },
    });

    return { success: "Altitude info updated." };
  }

  if (intent === "create-value" || intent === "update-value") {
    const value = String(formData.get("value") ?? "").trim();
    const startPoint = parsePoint(formData.get("startPoint"));
    const endPoint = parsePoint(formData.get("endPoint"));
    const useGradient = formData.get("useGradient") === "on";
    const startValue = parseFloat_(formData.get("startValue"));
    const endValue = parseFloat_(formData.get("endValue"));
    const valueId = String(formData.get("valueId") ?? "").trim();

    if (Number.isNaN(startPoint) || Number.isNaN(endPoint)) {
      return { error: "Start point and end point are required." };
    }

    if (startPoint > endPoint) {
      return { error: "Start point must be less than or equal to end point." };
    }

    if (useGradient) {
      if (startValue === null || endValue === null) {
        return { error: "Start value and end value are required when using gradient mode." };
      }
    } else {
      if (!value) {
        return { error: "Value is required when not using gradient mode." };
      }
    }

    const overlappingValue = existingAltitudeInfo.values.find((entry) => (
      entry.id !== valueId
      && rangesOverlap(
        { startPoint, endPoint },
        { startPoint: entry.startPoint, endPoint: entry.endPoint },
      )
    ));

    if (overlappingValue) {
      return {
        error: `This range overlaps an existing value band (${overlappingValue.startPoint} - ${overlappingValue.endPoint}).`,
      };
    }

    if (intent === "create-value") {
      await db.altitudeInfoValue.create({
        data: {
          altitudeInfoId: existingAltitudeInfo.id,
          value: useGradient ? "" : value,
          startPoint,
          endPoint,
          useGradient,
          startValue,
          endValue,
        },
      });

      return { success: "Altitude value band created." };
    }

    const existingValue = existingAltitudeInfo.values.find((entry) => entry.id === valueId);
    if (!existingValue) {
      return { error: "Altitude value band not found." };
    }

    await db.altitudeInfoValue.update({
      where: { id: existingValue.id },
      data: {
        value: useGradient ? "" : value,
        startPoint,
        endPoint,
        useGradient,
        startValue,
        endValue,
      },
    });

    return { success: "Altitude value band updated." };
  }

  if (intent === "delete-value") {
    const valueId = String(formData.get("valueId") ?? "").trim();
    const existingValue = existingAltitudeInfo.values.find((entry) => entry.id === valueId);

    if (!existingValue) {
      return { error: "Altitude value band not found." };
    }

    await db.altitudeInfoValue.delete({ where: { id: existingValue.id } });
    return { success: "Altitude value band deleted." };
  }

  return { error: "Invalid action." };
}

const AdminJourneyAltitudeInfoEditorRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const { altitudeInfoId } = useParams();
  const actionData = useActionData() as ActionData | undefined;
  const [confirmDeleteValueId, setConfirmDeleteValueId] = useState<string | null>(null);
  const [useGradientForNew, setUseGradientForNew] = useState(false);
  const [expandedGradientValues, setExpandedGradientValues] = useState<Record<string, boolean>>({});
  const altitudeInfo = journey.altitudeInfos.find((item) => item.id === altitudeInfoId);
  const [selectedTags, setSelectedTags] = useState<TagLike[]>(() =>
    (altitudeInfo?.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
  );

  const allTags: TagSuggestion[] = useMemo(
    () =>
      (journey.tags ?? []).map((tag) => ({
        id: tag.id,
        name: tag.name,
      })),
    [journey.tags],
  );

  useEffect(() => {
    if (altitudeInfo) {
      setSelectedTags((altitudeInfo.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })));
    }
  }, [altitudeInfo]);

  if (!altitudeInfo) {
    return <Alert color="red">Altitude info not found in this journey.</Alert>;
  }

  const toggleGradientExpand = (valueId: string) => {
    setExpandedGradientValues((prev) => ({
      ...prev,
      [valueId]: !prev[valueId],
    }));
  };
  const gradientBands = altitudeInfo.values.filter((valueBand) => valueBand.useGradient).length;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Altitude info editor"
        title={`Edit ${altitudeInfo.title}`}
        description="Tune the series identity, attach tags, and define non-overlapping value bands that activate across the journey altitude range."
        actions={(
          <>
            <Button component={Link} to={`/admin/${journey.id}/altitude-info`} variant="default">
              Back to altitude info
            </Button>
            <Button component={Link} to={`/admin/${journey.id}`} variant="light">
              Journey overview
            </Button>
          </>
        )}
      />

      <AdminStatGrid>
        <AdminStatCard label="Value bands" value={altitudeInfo.values.length} description="Non-overlapping ranges currently configured for this series." />
        <AdminStatCard label="Gradient bands" value={gradientBands} description="Bands that interpolate values between a start and end point." />
        <AdminStatCard label="Order" value={altitudeInfo.order} description="Display order used when multiple series are shown together." />
        <AdminStatCard label="Tags" value={selectedTags.length} description="Shared labels attached to this altitude info series." />
      </AdminStatGrid>

      <AdminSection
        title="Series settings"
        description="Control the series identity and tag assignment here before defining or editing its value bands below."
      >
        <Form method="post">
          <Stack>
            <Text size="sm" c="dimmed">Journey: {journey.name}</Text>
            <TextInput label="Title" name="title" required defaultValue={altitudeInfo.title} />
            <label>
              Icon
              <select name="icon" defaultValue={altitudeInfo.icon}>
                {ALTITUDE_INFO_ICON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <TextInput label="Order" name="order" type="number" inputMode="numeric" defaultValue={String(altitudeInfo.order)} />
            <Text size="sm" c="dimmed">
              Preview icon: <span aria-label={altitudeInfo.icon}>{resolveAltitudeInfoIconSymbol(altitudeInfo.icon)}</span>
            </Text>
            <TagSelector
              selected={selectedTags}
              allTags={allTags}
              maxTags={TAG_SYSTEM_MAX_COUNT}
              onChange={setSelectedTags}
            />
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="update-series">Update series</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      <AdminSection
        title="Add altitude value band"
        description="Bands cannot overlap within the same series. Use static values for fixed labels or gradient mode for interpolated readings."
      >
        <Form method="post">
          <Stack>
            <Checkbox
              label="Use gradient calculation (value interpolated between start and end)"
              name="useGradient"
              checked={useGradientForNew}
              onChange={(e) => setUseGradientForNew(e.currentTarget.checked)}
            />
            {useGradientForNew ? (
              <>
                <Text size="xs" c="dimmed">
                  The value will be automatically calculated based on the altitude within this range.
                </Text>
                <Group grow>
                  <TextInput
                    label="Start value"
                    name="startValue"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    required
                    placeholder="1"
                  />
                  <TextInput
                    label="End value"
                    name="endValue"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    required
                    placeholder="10"
                  />
                </Group>
              </>
            ) : (
              <TextInput label="Value" name="value" required placeholder="12 C" />
            )}
            <Group grow>
              <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue="0" />
              <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue="100" />
            </Group>
            <Group justify="flex-end">
              <Button type="submit" name="intent" value="create-value">Add value band</Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

      {actionData?.success ? <Alert color="green">{actionData.success}</Alert> : null}
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}

      <AdminSection
        title="Existing value bands"
        description="Edit or remove individual bands here. Each item shows its active range and whether it uses static or interpolated values."
      >
        {altitudeInfo.values.length === 0 ? (
          <Text c="dimmed">No altitude value bands yet.</Text>
        ) : (
          <Stack gap="sm">
            {altitudeInfo.values.map((valueBand) => (
              <Paper key={valueBand.id} radius="20px" p="md" style={{ border: "1px solid rgba(111, 134, 145, 0.14)" }}>
                <Form method="post">
                  <Stack gap="sm">
                    <input type="hidden" name="valueId" value={valueBand.id} />
                    <Checkbox
                      label="Use gradient calculation"
                      name="useGradient"
                      defaultChecked={valueBand.useGradient}
                      onChange={(e) => toggleGradientExpand(valueBand.id)}
                    />
                    {(expandedGradientValues[valueBand.id] ?? valueBand.useGradient) ? (
                      <>
                        <Text size="xs" c="dimmed">
                          Value will be interpolated between start and end values.
                        </Text>
                        <Group grow align="flex-end">
                          <TextInput
                            label="Start value"
                            name="startValue"
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            required
                            defaultValue={valueBand.startValue ?? ""}
                          />
                          <TextInput
                            label="End value"
                            name="endValue"
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            required
                            defaultValue={valueBand.endValue ?? ""}
                          />
                        </Group>
                      </>
                    ) : (
                      <TextInput label="Value" name="value" required defaultValue={valueBand.value} />
                    )}
                    <Group grow align="flex-end">
                      <TextInput label="Start point" name="startPoint" type="number" inputMode="numeric" required defaultValue={String(valueBand.startPoint)} />
                      <TextInput label="End point" name="endPoint" type="number" inputMode="numeric" required defaultValue={String(valueBand.endPoint)} />
                    </Group>
                    <Group gap="xs" justify="space-between">
                      <Text size="xs" c="dimmed">
                        Active from {valueBand.startPoint} to {valueBand.endPoint}
                      </Text>
                      <Group gap="xs">
                        <Button size="sm" type="submit" name="intent" value="update-value">Update</Button>
                        {confirmDeleteValueId === valueBand.id ? (
                          <>
                            <Button size="sm" color="red" type="submit" name="intent" value="delete-value">
                              Confirm delete
                            </Button>
                            <Button size="sm" variant="subtle" onClick={() => setConfirmDeleteValueId(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" color="red" variant="subtle" onClick={() => setConfirmDeleteValueId(valueBand.id)}>
                            Delete
                          </Button>
                        )}
                      </Group>
                    </Group>
                  </Stack>
                </Form>
              </Paper>
            ))}
          </Stack>
        )}
      </AdminSection>
    </AdminPage>
  );
};

export default AdminJourneyAltitudeInfoEditorRoute;