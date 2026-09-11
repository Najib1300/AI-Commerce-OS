# Database

The Phase 1A migration creates `profiles`, `organizations`, `organization_members`, `businesses`, `ai_jobs`, `usage_records`, and `audit_logs`, plus enums, indexes, timestamps, and account bootstrap triggers.

`202609110001_create_initial_workspace.sql` moves first-workspace provisioning into `create_initial_workspace(full_name, organization_name)`. This transactional, `SECURITY DEFINER` RPC derives the user from `auth.uid()`, serializes duplicate submissions, upserts the profile, creates one organization and owner membership, and resolves slug collisions with numeric suffixes. Anonymous execution is revoked; only authenticated users may call it. The signup trigger now creates only the profile, leaving organization naming to onboarding.

## Multi-tenancy and RLS

`organization_members` is the source of tenant access. Security-definer functions perform membership checks without recursive policies. Organizations are readable only by members; businesses, jobs, usage, and audit data inherit that boundary. Administrative membership changes require an owner or admin. The narrowly scoped initial-workspace RPC safely crosses the otherwise circular organization/member insert policies and uses only the server session identity. Browser-supplied user or owner IDs are never accepted.

## Applying migrations

Use `supabase db push` in a linked Supabase CLI project, or paste the migration into the Supabase SQL editor. The signup trigger atomically creates a profile, starter organization, and owner membership. Back up production data before future schema changes.
