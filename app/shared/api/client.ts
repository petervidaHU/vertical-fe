const API_BASE_URL =
  (globalThis as { process?: { env?: { API_BASE_URL?: string } } }).process?.env?.API_BASE_URL ?? "";

interface RequestOptions extends RequestInit {
  path: string;
}

export async function apiRequest<T>({ path, ...init }: RequestOptions): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    ...init,
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  if (!response.ok) {
    let message = response.statusText || `Request failed (${response.status})`;

    if (isJson) {
      try {
        const payload = (await response.json()) as { message?: string };
        if (payload.message) {
          message = payload.message;
        }
      } catch {
        // Keep fallback message when JSON error body cannot be parsed.
      }
    } else {
      const raw = (await response.text()).trim();
      if (raw.startsWith("<!DOCTYPE") || raw.startsWith("<html") || raw.startsWith("<")) {
        message = "Backend API is unavailable right now. Please start the backend and refresh.";
      } else if (raw.length > 0) {
        message = raw;
      }
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  if (!isJson) {
    const raw = (await response.text()).trim();
    if (raw.length === 0) {
      return undefined as T;
    }

    throw new Error("Backend API returned non-JSON content. Please verify the API server is running.");
  }

  return (await response.json()) as T;
}
