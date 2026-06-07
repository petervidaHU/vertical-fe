import { searchJourneyTags, TagApiError } from "../server/api/tags";

function errorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof TagApiError) {
    return Response.json({ message: error.message }, { status: error.status });
  }

  return Response.json({ message: fallbackMessage }, { status: 500 });
}

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);

  try {
    const tags = await searchJourneyTags(
      url.searchParams.get("journeyId") ?? "",
      url.searchParams.get("q") ?? "",
    );

    return Response.json(tags);
  } catch (error) {
    return errorResponse(error, "Unable to search tags.");
  }
}

export default function TagSearchApiRoute() {
  return null;
}