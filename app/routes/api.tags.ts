import { createJourneyTag, listJourneyTags, TagApiError } from "../server/api/tags";

function errorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof TagApiError) {
    return Response.json({ message: error.message }, { status: error.status });
  }

  return Response.json({ message: fallbackMessage }, { status: 500 });
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  try {
    const tags = await listJourneyTags(url.searchParams.get("journeyId") ?? "");
    return Response.json(tags);
  } catch (error) {
    return errorResponse(error, "Unable to load tags.");
  }
}

export async function action({ request }: { request: Request }) {
  if (request.method.toUpperCase() !== "POST") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "GET, POST" },
    });
  }

  try {
    const payload = (await request.json()) as { journeyId?: string; name?: string };
    const tag = await createJourneyTag(payload.journeyId ?? "", payload.name ?? "");
    return Response.json(tag, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to create tag.");
  }
}

export default function TagsApiRoute() {
  return null;
}