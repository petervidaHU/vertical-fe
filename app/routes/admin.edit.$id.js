import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Stack, TextInput, Title } from "@mantine/core";
import { Form, redirect, useActionData, useLoaderData } from "react-router";
import { ZodError } from "zod";
import { getStoryById, updateStory } from "../shared/api/endpoints";
import { mapStoryDtoToDomain } from "../shared/api/mappers";
import { parseStoryUpdateForm } from "../shared/validation/storySchemas";
export async function loader({ params }) {
    if (!params.id) {
        throw new Response("Missing story id", { status: 400, statusText: "Bad Request" });
    }
    const dto = await getStoryById(params.id);
    return mapStoryDtoToDomain(dto);
}
export async function action({ request, params, }) {
    const formData = await request.formData();
    try {
        const payload = parseStoryUpdateForm(formData, params.id);
        await updateStory(payload);
        return redirect("/admin/list");
    }
    catch (error) {
        if (error instanceof ZodError) {
            return { error: error.issues[0]?.message ?? "Invalid form values." };
        }
        return { error: "Unable to update story." };
    }
}
const AdminEditByIdRoute = () => {
    const story = useLoaderData();
    const actionData = useActionData();
    return (_jsxs(Stack, { children: [_jsx(Title, { order: 3, children: "Edit Story" }), _jsx(Form, { method: "post", children: _jsxs(Stack, { children: [_jsx(TextInput, { label: "Title", name: "title", required: true, defaultValue: story.title }), _jsx(TextInput, { label: "Epic title", name: "epicTitle", defaultValue: story.epicTitle }), _jsx(Button, { type: "submit", children: "Update" })] }) }), actionData?.error ? _jsx(Alert, { color: "red", children: actionData.error }) : null] }));
};
export default AdminEditByIdRoute;
