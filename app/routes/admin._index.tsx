import { Stack, Text, Title } from "@mantine/core";

const AdminIndexRoute = () => {
  return (
    <Stack>
      <Title order={3}>Overview</Title>
      <Text c="dimmed">Use Journeys, Epics, and Stories to manage timeline data.</Text>
    </Stack>
  );
};

export default AdminIndexRoute;
