import { Card, Stack, Text, Title } from "@mantine/core";
import { useLoaderData } from "react-router";
import { getStories } from "../shared/api/endpoints";
import { mapStoriesDtoToDomain } from "../shared/api/mappers";

export async function loader() {
  const stories = await getStories();
  return mapStoriesDtoToDomain(stories);
}

const AdminListRoute = () => {
  const stories = useLoaderData() as Awaited<ReturnType<typeof loader>>;

  return (
    <Stack>
      <Title order={3}>Story List</Title>
      {stories.length === 0 ? <Text>No stories found.</Text> : null}
      {stories.map((story) => (
        <Card key={story.id} withBorder>
          <Text fw={600}>{story.title}</Text>
          {story.epicTitle ? <Text c="dimmed">Epic: {story.epicTitle}</Text> : null}
        </Card>
      ))}
    </Stack>
  );
};

export default AdminListRoute;
