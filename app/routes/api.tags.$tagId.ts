import { deleteJourneyTag, TagApiError } from "../server/api/tags";

function errorResponse(error: unknown, fallbackMessage: string): Response {
  if (error instanceof TagApiError) {
    return Response.json({ message: error.message }, { status: error.status });
  }

  return Response.json({ message: fallbackMessage }, { status: 500 });
}

export async function action({
  request,
  params,
}: {
  request: Request;
  params: { tagId?: string };
}) {
  if (request.method.toUpperCase() !== "DELETE") {
    return new Response(null, {
      status: 405,
      headers: { Allow: "DELETE" },
    });
  }

  const url = new URL(request.url);

  try {
    const deleted = await deleteJourneyTag(
      url.searchParams.get("journeyId") ?? "",
      params.tagId ?? "",
    );

    return Response.json(deleted);
  } catch (error) {
    return errorResponse(error, "Unable to delete tag.");
  }
}

export default function TagDeleteApiRoute() {
  return null;
}