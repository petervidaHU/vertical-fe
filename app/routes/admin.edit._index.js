import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Alert, Button, Stack, TextInput, Title } from "@mantine/core";
import { Form, redirect, useActionData } from "react-router";
import { ZodError } from "zod";
import { createStory } from "../shared/api/endpoints";
import { parseStoryForm } from "../shared/validation/storySchemas";
export async function action({ request }) {
    const formData = await request.formData();
    try {
        const payload = parseStoryForm(formData);
        await createStory(payload);
        return redirect("/admin/list");
    }
    catch (error) {
        if (error instanceof ZodError) {
            return { error: error.issues[0]?.message ?? "Invalid form values." };
        }
        return { error: "Unable to create story." };
    }
}
const AdminEditIndexRoute = () => {
    const actionData = useActionData();
    return (_jsxs(Stack, { children: [_jsx(Title, { order: 3, children: "Create Story" }), _jsx(Form, { method: "post", children: _jsxs(Stack, { children: [_jsx(TextInput, { label: "Title", name: "title", required: true }), _jsx(TextInput, { label: "Epic title", name: "epicTitle" }), _jsx(Button, { type: "submit", children: "Create" })] }) }), actionData?.error ? _jsx(Alert, { color: "red", children: actionData.error }) : null] }));
};
export default AdminEditIndexRoute;
