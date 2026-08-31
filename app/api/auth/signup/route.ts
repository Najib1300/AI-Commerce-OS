import { createClient } from "@/lib/supabase/server";
import { handleSignup } from "@/lib/signup-api";

export async function POST(request: Request) {
  return handleSignup(request, createClient);
}
