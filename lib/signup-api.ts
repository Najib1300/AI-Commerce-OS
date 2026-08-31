import { NextResponse } from "next/server";
import { signupSchema } from "@/lib/validation";
import { ConfigurationError, getSupabasePublicConfig } from "@/lib/env";

export interface SignupClient {
  auth: { signUp(input: { email: string; password: string; options: { data: { full_name: string }; emailRedirectTo: string } }): Promise<{ error: { message: string } | null }> };
}

export async function handleSignup(request: Request, getClient: () => Promise<SignupClient>) {
  try {
    getSupabasePublicConfig();
    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ error: "Unsupported request format." }, { status: 415 });
    }

    const payload: unknown = await request.json();
    const parsed = signupSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid signup details." }, { status: 400 });
    }

    const supabase = await getClient();
    const callbackUrl = new URL("/auth/callback", request.url).toString();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { data: { full_name: parsed.data.fullName }, emailRedirectTo: callbackUrl },
    });

    if (error) {
      console.error("Supabase signup rejected the request", { message: error.message });
      return NextResponse.json({ error: "Unable to create account. Please try again." }, { status: 400 });
    }
    return NextResponse.json({ redirectTo: "/onboarding" }, { status: 201 });
  } catch (cause) {
    const configurationFailure = cause instanceof ConfigurationError;
    console.error("Signup endpoint failed", {
      type: configurationFailure ? "configuration" : "unexpected",
      message: cause instanceof Error ? cause.message : String(cause),
    });
    return NextResponse.json(
      { error: "Unable to create account. Please try again." },
      { status: configurationFailure ? 503 : 500 },
    );
  }
}
