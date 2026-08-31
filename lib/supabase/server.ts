import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "@/lib/env";
export async function createClient(){
 const store=await cookies();
 const config=getSupabasePublicConfig();
 return createServerClient(config.url,config.anonKey,{cookies:{getAll:()=>store.getAll(),setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Middleware refreshes cookies for Server Components. */}}}});
}
