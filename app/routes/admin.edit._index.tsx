import { Alert, Button, Stack, TextInput, Title } from "@mantine/core";
import { Form, redirect, useActionData } from "react-router";
import { ZodError } from "zod";
import { createStory } from "../shared/api/endpoints";
import { parseStoryForm } from "../shared/validation/storySchemas";

interface ActionResult {
  error?: string;
}

export async function action({ request }: { request: Request }): Promise<ActionResult | Response> {
  const formData = await request.formData();

  try {
    const payload = parseStoryForm(formData);
    await createStory(payload);

    return redirect("/admin/list");
  } catch (error) {
    if (error instanceof ZodError) {
      return { error: error.issues[0]?.message ?? "Invalid form values." };
    }

    return { error: "Unable to create story." };
  }
}

const AdminEditIndexRoute = () => {
  const actionData = useActionData() as ActionResult | undefined;

  return (
    <Stack>
      <Title order={3}>Create Story</Title>
      <Form method="post">
        <Stack>
          <TextInput label="Title" name="title" required />
          <TextInput label="Epic title" name="epicTitle" />
          <Button type="submit">Create</Button>
        </Stack>
      </Form>
      {actionData?.error ? <Alert color="red">{actionData.error}</Alert> : null}
    </Stack>
  );
};

export default AdminEditIndexRoute;
