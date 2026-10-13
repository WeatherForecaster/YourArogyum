
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8080"
).replace(/\/+$/, "");

type ApiOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, headers, ...requestOptions } = options;

  const url = `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...requestOptions,
      credentials: "include",
      headers: {
        ...(body !== undefined
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch {
    throw new Error(
      `Cannot connect to the backend at ${API_BASE_URL}. Check that Spring Boot is running and the API URL is correct.`,
    );
  }

  const responseText = await response.text();

  if (!response.ok) {
    let message = responseText;

    try {
      const parsed = JSON.parse(responseText);
      message =
        parsed.message ||
        parsed.error ||
        parsed.detail ||
        responseText;
    } catch {
      // Keep the original response text when it isn't JSON.
    }

    throw new Error(
      message || `Request failed with status ${response.status}`,
    );
  }

  if (response.status === 204 || !responseText) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(responseText) as T;
    } catch {
      throw new Error("The backend returned invalid JSON.");
    }
  }

  return responseText as T;
}

export { API_BASE_URL };
