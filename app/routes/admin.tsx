import { Card, Group, Stack, Title } from "@mantine/core";
import { Link, Outlet } from "react-router";

const AdminRoute = () => {
  return (
    <Stack>
      <Title order={2}>Admin</Title>
      <Group>
        <Link to="/admin/list">List</Link>
        <Link to="/admin/edit">Create</Link>
      </Group>
      <Card withBorder>
        <Outlet />
      </Card>
    </Stack>
  );
};

export default AdminRoute;
