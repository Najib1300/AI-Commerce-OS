import { redirect } from "next/navigation";
import { AuthFrame,Field,Submit } from "@/components/auth-form";
import { completeOnboarding } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
export default async function OnboardingPage({searchParams}:{searchParams:Promise<{error?:string}>}){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const {error}=await searchParams;return <AuthFrame title="Set up your workspace" subtitle="Tell us who you are and name your organization." error={error}><form action={completeOnboarding} className="mt-6 grid gap-4"><Field label="Full name" name="fullName" autoComplete="name"/><Field label="Organization name" name="organizationName"/><Submit>Finish setup</Submit></form></AuthFrame>}
