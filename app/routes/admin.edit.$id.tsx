import { Alert, Button, Stack, TextInput, Title } from "@mantine/core";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { ZodError } from "zod";
import { getStoryById, updateStory } from "../shared/api/endpoints";
import { mapStoryDtoToDomain } from "../shared/api/mappers";
import { parseStoryUpdateForm } from "../shared/validation/storySchemas";

interface ActionResult {
  error?: string;
}

export async function loader({ params }: { params: { id?: string } }) {
  if (!params.id) {
    throw new Response("Missing story id", { status: 400, statusText: "Bad Request" });
  }

  const dto = await getStoryById(params.id);
  return mapStoryDtoToDomain(dto);
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { id?: string };
}): Promise<ActionResult | Response> {
  const formData = await request.formData();

  try {
    const payload = parseStoryUpdateForm(formData, params.id);
    await updateStory(payload);

    return redirect("/admin/list");
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "Invalid form values." };
    }

    return { error: "Unable to update story." };
  }
}

const AdminEditByIdRoute = () => {
  const story = useLoaderData() as Awaited<ReturnType<typeof loader>>;
  const actionData = useActionData() as ActionResult | undefined;

  return (
    <Stack>
      <Title order={3}>Edit Story</Title>
      <Form method="post">
        <Stack>
          <TextInput label="Title" name="title" required defaultValue={story.title} />
          <TextInput label="Epic title" name="epicTitle" defaultValue={story.epicTitle} />
          <Button type="submit">Update</Button>
        </Stack>
      </Form>
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}
    </Stack>
  );
};

export default AdminEditByIdRoute;
