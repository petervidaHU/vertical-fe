import { Box, Button, Code, Group, Stack, Text, Textarea } from "@mantine/core";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { db } from "../server/db";
import { normalizeImportPayload } from "../features/admin/domain/importPayload";
import { readImportJsonSource } from "../features/admin/domain/importJsonSource";
import { AdminActionStatus, AdminPage, AdminPageHeader, AdminSection } from "../features/admin/components/AdminScaffold";

type JsonErrorContext = {
  lineNumber: number;
  columnNumber: number;
  lines: Array<{ number: number; content: string; isError: boolean }>;
};

type ActionData = { error?: string; errorContext?: JsonErrorContext };

function buildJsonErrorContext(raw: string, err: SyntaxError): JsonErrorContext | null {
  let line = -1;
  let column = -1;

  const modernMatch = err.message.match(/\(line (\d+) column (\d+)\)/);
  if (modernMatch) {
    line = parseInt(modernMatch[1], 10);
    column = parseInt(modernMatch[2], 10);
  } else {
    const posMatch = err.message.match(/position (\d+)/);
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const before = raw.slice(0, Math.min(pos, raw.length));
      const beforeLines = before.split("\n");
      line = beforeLines.length;
      column = (beforeLines[beforeLines.length - 1]?.length ?? 0) + 1;
    }
  }

  if (line === -1) return null;

  const allLines = raw.split("\n");
  const startIdx = Math.max(0, line - 2);
  const endIdx = Math.min(allLines.length - 1, line);

  const lines: JsonErrorContext["lines"] = [];
  for (let i = startIdx; i <= endIdx; i++) {
    lines.push({ number: i + 1, content: allLines[i] ?? "", isError: i + 1 === line });
  }

  return { lineNumber: line, columnNumber: column, lines };
}

export async function loader({ request, params }: { request: Request; params: { journeyId?: string } }) {
  if (!params.journeyId) {
    throw new Response("Missing journey id", { status: 400 });
  }

  const journey = await db.journey.findUnique({ where: { id: params.journeyId } });

  if (!journey) {
    throw new Response("Journey not found", { status: 404 });
  }

  const url = new URL(request.url);
  const success = url.searchParams.get("success");
  const formKey = url.searchParams.get("t") ?? "initial";

  return { journey, success, formKey };
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { journeyId?: string };
}): Promise<Response | ActionData> {
  const journeyId = params.journeyId?.trim() ?? "";

  if (!journeyId) {
    return { error: "Journey id is required." };
  }

  const formData = await request.formData();

  try {
    const raw = await readImportJsonSource(formData);

    let jsonData: unknown;
    try {
      jsonData = JSON.parse(raw);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        return {
          error: `JSON syntax error: ${parseError.message}`,
          errorContext: buildJsonErrorContext(raw, parseError) ?? undefined,
        };
      }
      return { error: "Unable to parse JSON." };
    }

    const parsed = normalizeImportPayload(jsonData);

    let altitudeInfosCreated = 0;
    let altitudeInfosUpdated = 0;
    let epicsCreated = 0;
    let epicsUpdated = 0;
    let storiesCreated = 0;
    let storiesUpdated = 0;

    await db.$transaction(async (tx) => {
      for (const altitudeInfo of parsed.altitudeInfos) {
        const existing = await tx.altitudeInfo.findFirst({
          where: { journeyId, title: altitudeInfo.title },
        });

        if (existing) {
          await tx.altitudeInfo.update({
            where: { id: existing.id },
            data: { icon: altitudeInfo.icon, order: altitudeInfo.order },
          });

          await tx.altitudeInfoValue.deleteMany({ where: { altitudeInfoId: existing.id } });

          for (const valueBand of altitudeInfo.values) {
            await tx.altitudeInfoValue.create({
              data: {
                altitudeInfoId: existing.id,
                value: valueBand.value,
                startPoint: valueBand.startPoint,
                endPoint: valueBand.endPoint,
                ...(valueBand.translations.length > 0 && {
                  translations: { create: valueBand.translations },
                }),
              },
            });
          }

          for (const translation of altitudeInfo.translations) {
            await tx.altitudeInfoTranslation.upsert({
              where: { altitudeInfoId_locale: { altitudeInfoId: existing.id, locale: translation.locale } },
              create: { altitudeInfoId: existing.id, locale: translation.locale, title: translation.title },
              update: { title: translation.title },
            });
          }

          for (const tagName of altitudeInfo.tags) {
            await tx.tag.upsert({
              where: { name: tagName },
              create: { name: tagName, journeyId },
              update: {},
            });
          }
          await tx.altitudeInfo.update({
            where: { id: existing.id },
            data: { tags: { set: altitudeInfo.tags.map((name) => ({ name })) } },
          });

          altitudeInfosUpdated += 1;
        } else {
          await tx.altitudeInfo.create({
            data: {
              title: altitudeInfo.title,
              icon: altitudeInfo.icon,
              order: altitudeInfo.order,
              journeyId,
              ...(altitudeInfo.translations.length > 0 && {
                translations: { create: altitudeInfo.translations },
              }),
              values: {
                create: altitudeInfo.values.map((valueBand) => ({
                  value: valueBand.value,
                  startPoint: valueBand.startPoint,
                  endPoint: valueBand.endPoint,
                  ...(valueBand.translations.length > 0 && {
                    translations: { create: valueBand.translations },
                  }),
                })),
              },
              ...(altitudeInfo.tags.length > 0 && {
                tags: {
                  connectOrCreate: altitudeInfo.tags.map((name) => ({
                    where: { name },
                    create: { name, journeyId },
                  })),
                },
              }),
            },
          });
          altitudeInfosCreated += 1;
        }
      }

      for (const epic of parsed.epics) {
        const existing = await tx.epic.findFirst({
          where: { journeyId, title: epic.title },
        });

        if (existing) {
          await tx.epic.update({
            where: { id: existing.id },
            data: {
              startPoint: epic.startPoint,
              endPoint: epic.endPoint,
              background: epic.background,
              backgroundImage: epic.backgroundImage,
              backgroundPatternConfig: epic.backgroundPatternConfig ?? undefined,
              color: epic.color,
            },
          });

          for (const translation of epic.translations) {
            await tx.epicTranslation.upsert({
              where: { epicId_locale: { epicId: existing.id, locale: translation.locale } },
              create: { epicId: existing.id, locale: translation.locale, title: translation.title, description: translation.description },
              update: { title: translation.title, description: translation.description },
            });
          }

          epicsUpdated += 1;
        } else {
          await tx.epic.create({
            data: {
              title: epic.title,
              color: epic.color,
              background: epic.background,
              backgroundImage: epic.backgroundImage,
              backgroundPatternConfig: epic.backgroundPatternConfig ?? undefined,
              journeyId,
              startPoint: epic.startPoint,
              endPoint: epic.endPoint,
              ...(epic.translations.length > 0 && {
                translations: { create: epic.translations },
              }),
            },
          });
          epicsCreated += 1;
        }
      }

      for (const story of parsed.stories) {
        const existing = await tx.story.findFirst({
          where: { journeyId, title: story.title, startPoint: story.startPoint },
        });

        if (existing) {
          await tx.story.update({
            where: { id: existing.id },
            data: {
              description: story.description,
              extraContent: story.extraContent,
              storyType: story.storyType,
              imageUrl: story.imageUrl,
              lineColor: story.lineColor,
              lineWidth: story.lineWidth,
              lineLabel: story.lineLabel,
              tooltipText: story.tooltipText,
              tooltipImageUrl: story.tooltipImageUrl,
              endPoint: story.endPoint,
            },
          });

          for (const translation of story.translations) {
            await tx.storyTranslation.upsert({
              where: { storyId_locale: { storyId: existing.id, locale: translation.locale } },
              create: { storyId: existing.id, ...translation },
              update: {
                title: translation.title,
                description: translation.description,
                extraContent: translation.extraContent,
                lineLabel: translation.lineLabel,
                tooltipText: translation.tooltipText,
              },
            });
          }

          for (const tagName of story.tags) {
            await tx.tag.upsert({
              where: { name: tagName },
              create: { name: tagName, journeyId },
              update: {},
            });
          }
          await tx.story.update({
            where: { id: existing.id },
            data: { tags: { set: story.tags.map((name) => ({ name })) } },
          });

          storiesUpdated += 1;
        } else {
          await tx.story.create({
            data: {
              title: story.title,
              description: story.description,
              extraContent: story.extraContent,
              storyType: story.storyType,
              imageUrl: story.imageUrl,
              lineColor: story.lineColor,
              lineWidth: story.lineWidth,
              lineLabel: story.lineLabel,
              tooltipText: story.tooltipText,
              tooltipImageUrl: story.tooltipImageUrl,
              journeyId,
              startPoint: story.startPoint,
              endPoint: story.endPoint,
              ...(story.translations.length > 0 && {
                translations: { create: story.translations },
              }),
              ...(story.tags.length > 0 && {
                tags: {
                  connectOrCreate: story.tags.map((name) => ({
                    where: { name },
                    create: { name, journeyId },
                  })),
                },
              }),
            },
          });
          storiesCreated += 1;
        }
      }
    });

    const parts: string[] = [];
    if (parsed.altitudeInfos.length > 0) {
      parts.push(`altitude info: ${altitudeInfosCreated} created, ${altitudeInfosUpdated} updated`);
    }
    if (parsed.epics.length > 0) {
      parts.push(`epics: ${epicsCreated} created, ${epicsUpdated} updated`);
    }
    if (parsed.stories.length > 0) {
      parts.push(`stories: ${storiesCreated} created, ${storiesUpdated} updated`);
    }

    const successText = encodeURIComponent(parts.join("; "));
    return redirect(`/admin/${journeyId}/import?success=${successText}&t=${Date.now()}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to import JSON.";
    return { error: message };
  }
}

const AdminImportRoute = () => {
  const { journey, success, formKey } = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const actionData = useActionData() as ActionData | undefined;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Import"
        title={`Import content — ${journey.name}`}
        description="Paste or upload JSON to merge epics, stories, and altitude info into this journey. Records matched by title are updated; new ones are created. Records not in the import are left unchanged."
        breadcrumbs={[
          { label: journey.name, to: `/admin/${journey.id}` },
          { label: "Import" },
        ]}
      />

      <AdminActionStatus success={success} error={actionData?.error} />

      {actionData?.errorContext && (
        <Box
          style={{
            fontFamily: "monospace",
            fontSize: "0.8rem",
            lineHeight: 1.6,
            background: "rgba(255,245,245,0.96)",
            border: "1px solid rgba(250,82,82,0.3)",
            borderRadius: 12,
            overflow: "auto",
            padding: "12px 0",
          }}
        >
          {actionData.errorContext.lines.map((ln) => (
            <Box key={ln.number}>
              <Box
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  background: ln.isError ? "rgba(255,82,82,0.1)" : "transparent",
                }}
              >
                <Text
                  component="span"
                  style={{
                    minWidth: 48,
                    paddingLeft: 12,
                    paddingRight: 12,
                    color: ln.isError ? "var(--mantine-color-red-6)" : "var(--mantine-color-gray-5)",
                    userSelect: "none",
                    textAlign: "right",
                    flexShrink: 0,
                    fontFamily: "monospace",
                    fontSize: "0.8rem",
                  }}
                >
                  {ln.number}
                </Text>
                <Code
                  style={{
                    background: "transparent",
                    color: ln.isError ? "var(--mantine-color-red-8)" : "var(--mantine-color-dark-7)",
                    whiteSpace: "pre",
                    flex: 1,
                    paddingLeft: 12,
                    paddingRight: 12,
                  }}
                >
                  {ln.content}
                </Code>
              </Box>
              {ln.isError && (
                <Box style={{ display: "flex" }}>
                  <Box style={{ minWidth: 48, flexShrink: 0 }} />
                  <Code
                    style={{
                      background: "transparent",
                      color: "var(--mantine-color-red-6)",
                      whiteSpace: "pre",
                      paddingLeft: 12,
                      userSelect: "none",
                    }}
                  >
                    {" ".repeat(Math.max(0, actionData.errorContext!.columnNumber - 1))}^
                  </Code>
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}

      <AdminSection
        title="Schemas and templates"
        description="Use these references when preparing or generating import JSON."
      >
        <Group gap="xs" wrap="wrap">
          <Button component="a" href="/admin-import/altitude-info.schema.json" download variant="light" size="xs">
            Altitude info schema
          </Button>
          <Button component="a" href="/admin-import/epic.schema.json" download variant="light" size="xs">
            Epic schema
          </Button>
          <Button component="a" href="/admin-import/story.schema.json" download variant="light" size="xs">
            Story schema
          </Button>
          <Button component="a" href="/admin-import/journey-import.template.json" download variant="light" size="xs">
            JSON template
          </Button>
          <Button component="a" href="/admin-import/ai-prompt.md" download variant="subtle" size="xs">
            AI prompt
          </Button>
        </Group>
      </AdminSection>

      <AdminSection
        title="Merge JSON into journey"
        description='Provide a JSON object with "altitudeInfos", "epics", and/or "stories" arrays. Epics and altitude info are matched by title; stories by title and start point.'
      >
        <Form method="post" encType="multipart/form-data" key={formKey}>
          <Stack>
            <Textarea
              label="Paste JSON"
              name="jsonText"
              placeholder={'{\n  "altitudeInfos": [...],\n  "epics": [...],\n  "stories": [...]\n}'}
              description='The root must be a JSON object with at least one of "altitudeInfos", "epics", or "stories" arrays. If pasted here, the uploaded file is ignored.'
              autosize
              minRows={8}
              maxRows={20}
              spellCheck={false}
              styles={{ input: { fontFamily: "monospace" } }}
            />
            <Text size="xs" c="dimmed" ta="center">or</Text>
            <label htmlFor="jsonFileUpload">JSON file</label>
            <input id="jsonFileUpload" name="jsonFile" type="file" accept="application/json,.json" />
            <Group justify="flex-end">
              <Button type="submit" color="teal">
                Import and merge
              </Button>
            </Group>
          </Stack>
        </Form>
      </AdminSection>

    </AdminPage>
  );
};

export default AdminImportRoute;
