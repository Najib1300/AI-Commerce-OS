// @vitest-environment node
import { describe,expect,it } from "vitest";
import { NextRequest } from "next/server";
import { getCallbackDestination,isPublicAuthPath } from "@/lib/auth-routes";
import { updateSession } from "@/lib/supabase/middleware";

describe("authentication routing", () => {
  it.each(["/signup","/login","/forgot-password","/api/auth/signup","/auth/callback"])("keeps %s public", (path) => {
    expect(isPublicAuthPath(path)).toBe(true);
  });

  it("does not mark dashboard routes public", () => expect(isPublicAuthPath("/dashboard")).toBe(false));

  it("allows signup through middleware without Supabase configuration", async () => {
    const response = await updateSession(new NextRequest("https://example.com/signup"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("uses the deployment origin for successful callbacks", () => {
    expect(getCallbackDestination("https://darkgrey-stork-713402.hostingersite.com/auth/callback?code=test", true).toString())
      .toBe("https://darkgrey-stork-713402.hostingersite.com/dashboard");
  });

  it("returns callback failures to login with a safe message", () => {
    const destination = getCallbackDestination("http://localhost:3000/auth/callback", false);
    expect(destination.origin).toBe("http://localhost:3000");
    expect(destination.pathname).toBe("/login");
    expect(destination.searchParams.get("error")).toBe("Unable to complete authentication. Please try again.");
  });
});
