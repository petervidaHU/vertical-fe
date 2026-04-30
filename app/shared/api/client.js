const API_BASE_URL = globalThis.process?.env?.API_BASE_URL ?? "";
export async function apiRequest({ path, ...init }) {
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
                const payload = (await response.json());
                if (payload.message) {
                    message = payload.message;
                }
            }
            catch {
                // Keep fallback message when JSON error body cannot be parsed.
            }
        }
        else {
            const raw = (await response.text()).trim();
            if (raw.startsWith("<!DOCTYPE") || raw.startsWith("<html") || raw.startsWith("<")) {
                message = "Backend API is unavailable right now. Please start the backend and refresh.";
            }
            else if (raw.length > 0) {
                message = raw;
            }
        }
        throw new Error(message);
    }
    if (response.status === 204) {
        return undefined;
    }
    if (!isJson) {
        const raw = (await response.text()).trim();
        if (raw.length === 0) {
            return undefined;
        }
        throw new Error("Backend API returned non-JSON content. Please verify the API server is running.");
    }
    return (await response.json());
}
