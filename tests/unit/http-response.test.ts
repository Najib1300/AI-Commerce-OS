import { describe,expect,it } from "vitest";
import { readJsonResponse } from "@/lib/http";

describe("JSON response handling", () => {
  it("returns JSON only for a successful JSON response", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    await expect(readJsonResponse<{ok:boolean}>(response)).resolves.toEqual({ ok: true });
  });

  it("handles an HTML server response without attempting JSON parsing", async () => {
    const response = new Response("<!DOCTYPE html><title>Error</title>", { status: 500, headers: { "Content-Type": "text/html" } });
    await expect(readJsonResponse(response)).rejects.toThrow("Expected JSON response but received text/html (500).");
  });
});
