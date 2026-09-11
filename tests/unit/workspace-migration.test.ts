// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe,expect,it } from "vitest";

const sql=readFileSync(resolve("supabase/migrations/202609110001_create_initial_workspace.sql"),"utf8").toLowerCase();

describe("create_initial_workspace migration",()=>{
  it("uses auth.uid internally and accepts no browser identity parameters",()=>{expect(sql).toContain("v_user_id uuid := auth.uid()");expect(sql).not.toMatch(/p_(user|owner)_id/);});
  it("upserts the profile and creates the organization and owner membership",()=>{expect(sql).toContain("insert into public.profiles");expect(sql).toContain("on conflict (id) do update");expect(sql).toContain("insert into public.organizations");expect(sql).toContain("insert into public.organization_members");expect(sql).toContain("v_user_id, 'owner'");});
  it("makes duplicate submission idempotent",()=>{expect(sql).toContain("for update");expect(sql).toContain("if v_existing_organization_id is not null then");expect(sql).toContain("return v_existing_organization_id");});
  it("allocates collision-safe unique slugs",()=>{expect(sql).toContain("pg_advisory_xact_lock");expect(sql).toContain("while exists");expect(sql).toContain("v_base_slug || '-' || v_suffix::text");});
  it("blocks anonymous execution while allowing authenticated users",()=>{expect(sql).toContain("revoke all on function public.create_initial_workspace(text, text) from anon");expect(sql).toContain("grant execute on function public.create_initial_workspace(text, text) to authenticated");});
});
