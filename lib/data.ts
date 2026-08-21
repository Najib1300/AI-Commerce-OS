import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";
import type { Business } from "@/types/database";
export async function requireUser(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");return {supabase,user};}
export async function getCurrentOrganization(){const {supabase,user}=await requireUser();const {data,error}=await supabase.from("organization_members").select("organization_id,role,organizations(id,name,slug)").eq("user_id",user.id).limit(1).single();if(error||!data)redirect("/onboarding");return {supabase,user,membership:data};}
export async function canAccessOrganization(organizationId:string,userId:string){if(!idSchema.safeParse(organizationId).success||!idSchema.safeParse(userId).success)return false;const supabase=await createClient();const {data}=await supabase.from("organization_members").select("id").eq("organization_id",organizationId).eq("user_id",userId).maybeSingle();return Boolean(data);}
export async function getBusinesses(){const {supabase,membership}=await getCurrentOrganization();const {data,error}=await supabase.from("businesses").select("*").eq("organization_id",membership.organization_id).order("created_at",{ascending:false});if(error)throw new Error(error.message);return data as Business[];}
export async function getBusiness(id:string){const parsed=idSchema.safeParse(id);if(!parsed.success)return null;const {supabase,membership}=await getCurrentOrganization();const {data}=await supabase.from("businesses").select("*").eq("id",parsed.data).eq("organization_id",membership.organization_id).maybeSingle();return data as Business|null;}
