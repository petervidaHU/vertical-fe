import { index, route } from "@react-router/dev/routes";
export default [
    index("routes/_index.tsx"),
    route("admin", "routes/admin.tsx", [
        index("routes/admin._index.tsx"),
        route("list", "routes/admin.list.tsx"),
        route("edit", "routes/admin.edit._index.tsx"),
        route("edit/:id", "routes/admin.edit.$id.tsx"),
    ]),
];
