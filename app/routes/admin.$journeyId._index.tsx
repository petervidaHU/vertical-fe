import { ActionIcon, Alert, Button, Group, SimpleGrid, Stack, Text, TextInput, Textarea, Tooltip } from "@mantine/core";
import { useState } from "react";
import { Form, useActionData, useOutletContext, useParams } from "react-router";
import BackgroundField from "../features/admin/components/BackgroundField";
import AdminJourneyMapPreviewClient from "../features/admin/components/AdminJourneyMapPreviewClient";
import { AdminPage, AdminSection, AdminStatCard, AdminStatGrid } from "../features/admin/components/AdminScaffold";
import TranslatedFields from "../features/admin/components/TranslatedFields";
import { asTranslationDelegate, translatedFieldName, translationDefault, writeEntityTranslations } from "../features/admin/domain/translations";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";
import {
  serializeBackground,
  tryParseBackgroundInput,
} from "../shared/domain/background";
import { db } from "../server/db";

type ActionData = { error?: string; success?: string };

function CopyIconButton({ url }: { url: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");

  const handleCopy = async () => {
    try {
      const text = await fetch(url).then((r) => r.text());
      await navigator.clipboard.writeText(text);
      setState("done");
      window.setTimeout(() => setState("idle"), 1600);
    } catch {
      setState("error");
      window.setTimeout(() => setState("idle"), 2000);
    }
  };

  return (
    <Tooltip
      label={state === "done" ? "Copied!" : state === "error" ? "Copy failed" : "Copy to clipboard"}
      withArrow
    >
      <ActionIcon
        variant="subtle"
        color={state === "done" ? "green" : state === "error" ? "red" : "gray"}
        size="xs"
        onClick={handleCopy}
      >
        {state === "done" ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </ActionIcon>
    </Tooltip>
  );
}

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

  await writeEntityTranslations({
    delegate: asTranslationDelegate(db.journeyTranslation),
    parentKey: "journeyId",
    parentId: params.journeyId,
    fields: ["name"],
    formData,
  });

  return { success: "Journey updated." };
}

const AdminJourneyOverviewRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const { epicId, storyId } = useParams();
  const actionData = useActionData() as ActionData | undefined;

  return (
    <AdminPage>
      <AdminStatGrid>
        <AdminStatCard
          label="Altitude info"
          value={journey.altitudeInfos.length}
          description="Indicator series attached to this journey."
        />
        <AdminStatCard
          label="Epics"
          value={journey.epics.length}
          description="Major altitude bands defined."
        />
        <AdminStatCard
          label="Stories"
          value={journey.stories.length}
          description="Cards and line events in the timeline."
        />
        <AdminStatCard
          label="Tags"
          value={journey.tags?.length ?? 0}
          description="Shared labels for filtering."
        />
      </AdminStatGrid>

      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
        <AdminSection title="Journey map">
          <AdminJourneyMapPreviewClient
            journeyName={journey.name}
            startGround={journey.startingPoint}
            epics={journey.epics}
            stories={journey.stories}
            height={380}
            getEpicHref={(currentEpicId) => `/admin/${journey.id}/epics/${currentEpicId}`}
            getStoryHref={(currentStoryId) => `/admin/${journey.id}/stories/${currentStoryId}`}
            selectedEpicId={epicId ?? null}
            selectedStoryId={storyId ?? null}
            highlightedStoryIds={[]}
          />
        </AdminSection>

        <Stack gap="md">
          <AdminSection title="Journey settings">
            <Form method="post">
              <Stack>
                <TranslatedFields
                  render={(locale, isSourceLocale) => (
                    <TextInput
                      label="Name"
                      name={translatedFieldName("name", locale)}
                      required={isSourceLocale}
                      defaultValue={translationDefault(journey.name, journey.translations, "name", locale)}
                    />
                  )}
                />
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
            {actionData?.success ? <Alert color="green" mt="sm">{actionData.success}</Alert> : null}
            {actionData?.error ? <Alert color="red" mt="sm">{actionData.error}</Alert> : null}
          </AdminSection>

          <AdminSection title="Import content">
            <Form method="post" action={`/admin/${journey.id}/epics`} encType="multipart/form-data">
              <Stack>
                <Group gap="xs">
                  <Group gap={4} wrap="nowrap">
                    <Button component="a" href="/admin-import/altitude-info.schema.json" download variant="light" size="xs">
                      Altitude info schema
                    </Button>
                    <CopyIconButton url="/admin-import/altitude-info.schema.json" />
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <Button component="a" href="/admin-import/epic.schema.json" download variant="light" size="xs">
                      Epic schema
                    </Button>
                    <CopyIconButton url="/admin-import/epic.schema.json" />
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <Button component="a" href="/admin-import/story.schema.json" download variant="light" size="xs">
                      Story schema
                    </Button>
                    <CopyIconButton url="/admin-import/story.schema.json" />
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <Button component="a" href="/admin-import/journey-import.template.json" download variant="light" size="xs">
                      JSON template
                    </Button>
                    <CopyIconButton url="/admin-import/journey-import.template.json" />
                  </Group>
                  <Group gap={4} wrap="nowrap">
                    <Button component="a" href="/admin-import/ai-prompt.md" download variant="subtle" size="xs">
                      AI prompt
                    </Button>
                    <CopyIconButton url="/admin-import/ai-prompt.md" />
                  </Group>
                </Group>
                <Textarea
                  label="Paste JSON"
                  name="jsonText"
                  placeholder='{"altitudeInfos": [...], "epics": [...], "stories": [...]}'
                  autosize
                  minRows={4}
                  maxRows={12}
                  spellCheck={false}
                  styles={{ input: { fontFamily: "monospace" } }}
                />
                <Text size="xs" c="dimmed" ta="center">or</Text>
                <label htmlFor="journeyJsonFileUpload">JSON file</label>
                <input id="journeyJsonFileUpload" name="jsonFile" type="file" accept="application/json,.json" />
                <Group justify="flex-end">
                  <Button type="submit" name="intent" value="import-json" color="teal">
                    Import JSON
                  </Button>
                </Group>
              </Stack>
            </Form>
          </AdminSection>
        </Stack>
      </SimpleGrid>
    </AdminPage>
  );
};

export default AdminJourneyOverviewRoute;
