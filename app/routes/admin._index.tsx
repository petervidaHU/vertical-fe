import { Stack, Text, Title } from "@mantine/core";

const AdminIndexRoute = () => {
  return (
    <Stack>
      <Title order={3}>Admin Home</Title>
      <Text c="dimmed">Choose List or Create from the navigation above.</Text>
    </Stack>
  );
};

export default AdminIndexRoute;
