import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/_index.tsx"),
  route("api/tags", "routes/api.tags.ts"),
  route("api/tags/search", "routes/api.tags.search.ts"),
  route("api/tags/:tagId", "routes/api.tags.$tagId.ts"),
  route("journey", "routes/journey.tsx", [
    index("routes/journey._index.tsx"),
    route(":id", "routes/journey.$id.tsx"),
  ]),
  route("admin", "routes/admin.tsx", [
    index("routes/admin._index.tsx"),
    route("journeys", "routes/admin.journeys.tsx"),
    route(":journeyId", "routes/admin.$journeyId.tsx", [
      index("routes/admin.$journeyId._index.tsx"),
      route("altitude-info", "routes/admin.altitude-info.tsx"),
      route("altitude-info/:altitudeInfoId", "routes/admin.$journeyId.altitude-info.$altitudeInfoId.tsx"),
      route("epics", "routes/admin.epics.tsx"),
      route("epics/:epicId", "routes/admin.$journeyId.epics.$epicId.tsx"),
      route("stories", "routes/admin.stories.tsx"),
      route("stories/:storyId", "routes/admin.$journeyId.stories.$storyId.tsx"),
      route("tags", "routes/admin.$journeyId.tags.tsx"),
      route("import", "routes/admin.$journeyId.import.tsx"),
    ]),
  ]),
  route("documentation", "routes/documentation.tsx"),
] satisfies RouteConfig;
