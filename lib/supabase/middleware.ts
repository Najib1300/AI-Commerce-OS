import { createServerClient } from "@supabase/ssr";
import { NextResponse,type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/env";
import { isPublicAuthPath } from "@/lib/auth-routes";
export async function updateSession(request:NextRequest){
 let response=NextResponse.next({request});
 if(isPublicAuthPath(request.nextUrl.pathname))return response;
 const protectedRoute=["/dashboard","/businesses","/onboarding"].some(path=>request.nextUrl.pathname.startsWith(path));
 if(!protectedRoute)return response;
 const config=getSupabasePublicConfig();
 const supabase=createServerClient(config.url,config.anonKey,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value})=>request.cookies.set(name,value));response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}}});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user&&protectedRoute)return NextResponse.redirect(new URL("/login",request.url));
 return response;
}
