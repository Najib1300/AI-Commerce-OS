"use server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema,loginSchema,onboardingSchema } from "@/lib/validation";
import { slugify } from "@/lib/utils";

function values(formData:FormData){return Object.fromEntries(formData.entries());}
function fail(path:string,message:string):never{redirect(`${path}?error=${encodeURIComponent(message)}`);}

export async function login(formData:FormData){const parsed=loginSchema.safeParse(values(formData));if(!parsed.success)fail("/login",parsed.error.issues[0]?.message??"Invalid details");const supabase=await createClient();const {error}=await supabase.auth.signInWithPassword(parsed.data);if(error)fail("/login",error.message);redirect("/dashboard");}
export async function forgotPassword(formData:FormData){const parsed=forgotPasswordSchema.safeParse(values(formData));if(!parsed.success)fail("/forgot-password",parsed.error.issues[0]?.message??"Invalid email");const supabase=await createClient();const {error}=await supabase.auth.resetPasswordForEmail(parsed.data.email,{redirectTo:`${process.env.NEXT_PUBLIC_SITE_URL??"http://localhost:3000"}/auth/callback`});if(error)fail("/forgot-password",error.message);redirect("/forgot-password?sent=1");}
export async function completeOnboarding(formData:FormData){const parsed=onboardingSchema.safeParse(values(formData));if(!parsed.success)fail("/onboarding",parsed.error.issues[0]?.message??"Invalid details");const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");const {data:membership,error:membershipError}=await supabase.from("organization_members").select("organization_id").eq("user_id",user.id).limit(1).single();if(membershipError||!membership)fail("/onboarding","Your workspace could not be found");const {error:profileError}=await supabase.from("profiles").update({full_name:parsed.data.fullName}).eq("id",user.id);if(profileError)fail("/onboarding",profileError.message);const base=slugify(parsed.data.organizationName);const {error:orgError}=await supabase.from("organizations").update({name:parsed.data.organizationName,slug:`${base}-${membership.organization_id.slice(0,8)}`}).eq("id",membership.organization_id);if(orgError)fail("/onboarding",orgError.message);redirect("/dashboard");}
