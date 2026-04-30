import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("list", "routes/list.tsx"),
  route("journey", "routes/journey.tsx", [
    index("routes/journey._index.tsx"),
    route(":id", "routes/journey.$id.tsx"),
  ]),
  route("admin", "routes/admin.tsx", [
    index("routes/admin._index.tsx"),
    route("list", "routes/admin.list.tsx"),
    route("edit", "routes/admin.edit._index.tsx"),
    route("edit/:id", "routes/admin.edit.$id.tsx"),
  ]),
  route("documentation", "routes/documentation.tsx"),
] satisfies RouteConfig;
