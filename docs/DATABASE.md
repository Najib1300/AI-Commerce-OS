# Database

The Phase 1A migration creates `profiles`, `organizations`, `organization_members`, `businesses`, `ai_jobs`, `usage_records`, and `audit_logs`, plus enums, indexes, timestamps, and account bootstrap triggers.

## Multi-tenancy and RLS

`organization_members` is the source of tenant access. Security-definer functions perform membership checks without recursive policies. Organizations are readable only by members; businesses, jobs, usage, and audit data inherit that boundary. Administrative membership changes require an owner or admin. Browser-supplied organization IDs are never accepted directly by mutations: the current organization is resolved from the authenticated user's membership.

## Applying migrations

Use `supabase db push` in a linked Supabase CLI project, or paste the migration into the Supabase SQL editor. The signup trigger atomically creates a profile, starter organization, and owner membership. Back up production data before future schema changes.
