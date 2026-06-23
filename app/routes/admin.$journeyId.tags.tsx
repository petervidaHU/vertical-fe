import { Badge, Button, Group, Paper, Stack, Text, TextInput } from "@mantine/core";
import { useMemo, useState } from "react";
import { Form, useActionData, useOutletContext } from "react-router";
import { AdminActionStatus, AdminPage, AdminSection } from "../features/admin/components/AdminScaffold";
import { TAG_SYSTEM_MAX_COUNT } from "../features/tags/domain/tags";
import { createJourneyTag, deleteJourneyTag, renameJourneyTag } from "../server/api/tags";
import type { AdminJourneyOutletContext } from "./admin.$journeyId";

type ActionData = { error?: string; success?: string };

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
  const intent = String(formData.get("intent") ?? "");

  try {
    if (intent === "create") {
      const created = await createJourneyTag(params.journeyId, String(formData.get("name") ?? ""));
      return { success: `Tag "${created.name}" created.` };
    }

    if (intent === "rename") {
      const renamed = await renameJourneyTag(
        params.journeyId,
        String(formData.get("tagId") ?? ""),
        String(formData.get("newName") ?? ""),
      );
      return { success: `Tag renamed to "${renamed.name}".` };
    }

    if (intent === "delete") {
      const deleted = await deleteJourneyTag(params.journeyId, String(formData.get("tagId") ?? ""));
      return { success: `Tag "${deleted.name}" deleted.` };
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to update tags.",
    };
  }

  return { error: "Invalid action." };
}

const AdminJourneyTagsRoute = () => {
  const { journey } = useOutletContext<AdminJourneyOutletContext>();
  const actionData = useActionData() as ActionData | undefined;
  const [renamingTagId, setRenamingTagId] = useState<string | null>(null);
  const [deleteConfirmTagId, setDeleteConfirmTagId] = useState<string | null>(null);

  const tagsWithUsage = useMemo(() => {
    return (journey.tags ?? []).map((tag) => {
      const storyCount = journey.stories.filter((s) =>
        (s.tags ?? []).some((t) => t.id === tag.id),
      ).length;
      const altitudeInfoCount = journey.altitudeInfos.filter((a) =>
        (a.tags ?? []).some((t) => t.id === tag.id),
      ).length;
      return {
        ...tag,
        usageCount: storyCount + altitudeInfoCount,
      };
    });
  }, [journey]);
  const usedTags = tagsWithUsage.filter((tag) => tag.usageCount > 0).length;

  return (
    <AdminPage>
      <AdminActionStatus success={actionData?.success} error={actionData?.error} />

      <AdminSection
        title="Create a new tag"
        description="Create shared labels here so editors can attach them consistently across stories and altitude info."
      >
        <Form method="post">
          <Stack>
            <Group align="flex-end">
              <TextInput
                name="name"
                label="Tag name"
                placeholder="Enter tag name (3-100 characters)"
                required
                minLength={3}
                maxLength={100}
                style={{ flex: 1 }}
              />
              <Button type="submit" name="intent" value="create" color="grape">
                Create tag
              </Button>
            </Group>
            <Text size="xs" c="dimmed">
              {journey.tags?.length ?? 0} of {TAG_SYSTEM_MAX_COUNT} tags used.
            </Text>
          </Stack>
        </Form>
      </AdminSection>

      <AdminSection
        title={`All tags (${tagsWithUsage.length})`}
        description="Rename or remove tags here. Usage counts make it clear which tags are already attached to content."
      >
        {tagsWithUsage.length === 0 ? (
          <Text c="dimmed">No tags created yet.</Text>
        ) : (
          <Stack gap="sm">
            {tagsWithUsage.map((tag) => (
              <Paper
                key={tag.id}
                radius="20px"
                p="md"
                style={{
                  border: "1px solid rgba(111, 134, 145, 0.14)",
                  background: "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(247, 250, 251, 0.94) 100%)",
                }}
              >
                {renamingTagId === tag.id ? (
                  <Form method="post">
                    <Stack gap="xs">
                      <input type="hidden" name="tagId" value={tag.id} />
                      <input type="hidden" name="intent" value="rename" />
                      <Group align="flex-end">
                        <TextInput
                          name="newName"
                          label="New name"
                          defaultValue={tag.name}
                          required
                          minLength={3}
                          maxLength={100}
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <Button type="submit" size="sm" color="grape">
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="subtle"
                          onClick={() => setRenamingTagId(null)}
                        >
                          Cancel
                        </Button>
                      </Group>
                    </Stack>
                  </Form>
                ) : (
                  <Group justify="space-between" align="center">
                    <Group gap="sm">
                      <Badge variant="light" color="grape" size="lg">
                        {tag.name}
                      </Badge>
                      <Text size="sm" c="dimmed">
                        Used by {tag.usageCount} item{tag.usageCount === 1 ? "" : "s"}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Button
                        size="sm"
                        variant="light"
                        color="grape"
                        onClick={() => {
                          setRenamingTagId(tag.id);
                          setDeleteConfirmTagId(null);
                        }}
                      >
                        Rename
                      </Button>
                      {deleteConfirmTagId === tag.id ? (
                        <Form method="post">
                          <input type="hidden" name="tagId" value={tag.id} />
                          <input type="hidden" name="intent" value="delete" />
                          <Group gap="xs">
                            <Button size="sm" color="red" type="submit">
                              Confirm delete
                            </Button>
                            <Button
                              size="sm"
                              variant="subtle"
                              type="button"
                              onClick={() => setDeleteConfirmTagId(null)}
                            >
                              Cancel
                            </Button>
                          </Group>
                        </Form>
                      ) : (
                        <Button
                          size="sm"
                          color="red"
                          variant="subtle"
                          onClick={() => {
                            setDeleteConfirmTagId(tag.id);
                            setRenamingTagId(null);
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </Group>
                  </Group>
                )}
              </Paper>
            ))}
          </Stack>
        )}
      </AdminSection>
    </AdminPage>
  );
};

export default AdminJourneyTagsRoute;
