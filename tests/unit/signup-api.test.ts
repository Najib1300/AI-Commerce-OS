import { afterEach,describe,expect,it,vi } from "vitest";
import { handleSignup } from "@/lib/signup-api";

function request(body: unknown) {
  return new Request("https://darkgrey-stork-713402.hostingersite.com/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validSignup = { fullName: "Test Founder", email: "founder@example.com", password: "password123" };

describe("signup API", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("returns a successful JSON signup response", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    const signUp = vi.fn().mockResolvedValue({ error: null });
    const response = await handleSignup(request(validSignup), async () => ({ auth: { signUp } }));
    expect(response.status).toBe(201);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ redirectTo: "/onboarding" });
    expect(signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({
        emailRedirectTo: "https://darkgrey-stork-713402.hostingersite.com/auth/callback",
      }),
    }));
  });

  it("returns safe JSON when Supabase rejects signup", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    const response = await handleSignup(request(validSignup), async () => ({
      auth: { signUp: vi.fn().mockResolvedValue({ error: { message: "Provider detail" } }) },
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Unable to create account. Please try again." });
  });

  it("returns JSON when environment configuration is missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const getClient = vi.fn();
    const response = await handleSignup(request(validSignup), getClient);
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Unable to create account. Please try again." });
    expect(getClient).not.toHaveBeenCalled();
  });
});
