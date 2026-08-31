export interface ApiErrorBody { error?: string }

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const ok = response.ok;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error(`Expected JSON response but received ${contentType || "an unknown content type"} (${response.status}).`);
  }

  const body: unknown = await response.json();
  if (!ok) {
    const message = typeof body === "object" && body !== null && "error" in body && typeof body.error === "string"
      ? body.error
      : "Request failed.";
    throw new Error(message);
  }
  return body as T;
}
