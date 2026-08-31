"use client";
import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/env";
export function createClient(){ const config=getSupabasePublicConfig();return createBrowserClient(config.url,config.anonKey); }
