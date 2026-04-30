import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Stack, Text, Title } from "@mantine/core";
import { useLoaderData } from "react-router";
import { getStories } from "../shared/api/endpoints";
import { mapStoriesDtoToDomain } from "../shared/api/mappers";
export async function loader() {
    const stories = await getStories();
    return mapStoriesDtoToDomain(stories);
}
const AdminListRoute = () => {
    const stories = useLoaderData();
    return (_jsxs(Stack, { children: [_jsx(Title, { order: 3, children: "Story List" }), stories.length === 0 ? _jsx(Text, { children: "No stories found." }) : null, stories.map((story) => (_jsxs(Card, { withBorder: true, children: [_jsx(Text, { fw: 600, children: story.title }), story.epicTitle ? _jsxs(Text, { c: "dimmed", children: ["Epic: ", story.epicTitle] }) : null] }, story.id)))] }));
};
export default AdminListRoute;
