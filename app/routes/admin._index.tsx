import { Button, Paper, SimpleGrid, Stack, Text } from "@mantine/core";
import { Link } from "react-router";
import { AdminPage, AdminPageHeader, AdminSection } from "../features/admin/components/AdminScaffold";

const AdminIndexRoute = () => {
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Overview"
        title="Choose the workflow, not the file"
        description="The redesigned admin is organized around the actual editing flow: start with journeys, enter a journey workspace, then manage altitude info, epics, stories, and tags in one place."
        actions={(
          <Button component={Link} to="/admin/journeys" color="teal">
            Open journeys
          </Button>
        )}
      />

      <AdminSection
        title="Recommended flow"
        description="Keep the mental model simple: define the container first, then add structure, then fill it with content."
      >
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
          <Paper radius="xl" p="lg" style={{ border: "1px solid rgba(111, 134, 145, 0.14)", background: "rgba(248, 251, 252, 0.9)" }}>
            <Stack gap={6}>
              <Text size="xs" tt="uppercase" fw={800} c="teal.8" style={{ letterSpacing: "0.12em" }}>
                1. Create a journey
              </Text>
              <Text fw={700}>Set up the container for one timeline.</Text>
              <Text size="sm" c="dimmed">
                Give the journey a name, slug, and ground style before adding any altitude data or story content.
              </Text>
            </Stack>
          </Paper>

          <Paper radius="xl" p="lg" style={{ border: "1px solid rgba(111, 134, 145, 0.14)", background: "rgba(248, 251, 252, 0.9)" }}>
            <Stack gap={6}>
              <Text size="xs" tt="uppercase" fw={800} c="teal.8" style={{ letterSpacing: "0.12em" }}>
                2. Open the workspace
              </Text>
              <Text fw={700}>Edit with the journey map in view.</Text>
              <Text size="sm" c="dimmed">
                Journey workspaces keep epics, stories, altitude info, and tags grouped under the same vertical map.
              </Text>
            </Stack>
          </Paper>

          <Paper radius="xl" p="lg" style={{ border: "1px solid rgba(111, 134, 145, 0.14)", background: "rgba(248, 251, 252, 0.9)" }}>
            <Stack gap={6}>
              <Text size="xs" tt="uppercase" fw={800} c="teal.8" style={{ letterSpacing: "0.12em" }}>
                3. Refine content
              </Text>
              <Text fw={700}>Use the right screen for the right depth.</Text>
              <Text size="sm" c="dimmed">
                List pages answer what exists. Detail pages answer what needs to change. Tags keep filtering and labeling consistent.
              </Text>
            </Stack>
          </Paper>
        </SimpleGrid>
      </AdminSection>
    </AdminPage>
  );
};

export default AdminIndexRoute;
