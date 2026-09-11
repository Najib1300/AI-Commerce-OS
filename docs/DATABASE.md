# Database

Phase 1C adds `brand_generation_runs` and `brand_directions` in `202609110003_brand_creation.sql`. Composite foreign keys bind each run to its organization, business, and selected Product Research opportunity, and bind every direction to that same tuple. Partial indexes enforce one active run, one selected direction, and one approved direction per business.

Members receive tenant-scoped RLS reads only. Mutations use `start_brand_generation`, `complete_brand_generation`, `fail_brand_generation`, `select_brand_direction`, `reject_brand_direction`, `update_selected_brand`, and `approve_brand_direction`. Each security-definer function uses an empty search path, schema-qualified objects, authenticated membership checks, and constrained state transitions. Business/run deletion cascades dependent brand data; selected products referenced by brand history are protected from deletion.

The Phase 1A migration creates `profiles`, `organizations`, `organization_members`, `businesses`, `ai_jobs`, `usage_records`, and `audit_logs`, plus enums, indexes, timestamps, and account bootstrap triggers.

`202609110001_create_initial_workspace.sql` moves first-workspace provisioning into `create_initial_workspace(full_name, organization_name)`. This transactional, `SECURITY DEFINER` RPC derives the user from `auth.uid()`, serializes duplicate submissions, upserts the profile, creates one organization and owner membership, and resolves slug collisions with numeric suffixes. Anonymous execution is revoked; only authenticated users may call it. The signup trigger now creates only the profile, leaving organization naming to onboarding.

## Multi-tenancy and RLS

`organization_members` is the source of tenant access. Security-definer functions perform membership checks without recursive policies. Organizations are readable only by members; businesses, jobs, usage, and audit data inherit that boundary. Administrative membership changes require an owner or admin. The narrowly scoped initial-workspace RPC safely crosses the otherwise circular organization/member insert policies and uses only the server session identity. Browser-supplied user or owner IDs are never accepted.

## Phase 1B product research

`202609110002_product_research.sql` adds `product_research_runs` and `product_opportunities`, their status enums, composite integrity constraints, indexes, timestamps, and tenant RLS. Members can select tenant data but cannot mutate the tables directly. Narrow, empty-search-path RPCs start, complete, fail, select, and reject research records while deriving authorization from `auth.uid()` and fully qualified membership relationships. Partial unique indexes enforce one active research run and one selected product per business. The selection RPC requires a completed run and uses a transaction-level advisory lock to replace the selected product safely without changing rejected products.

The migration is local only until explicitly reviewed and applied. It must be applied after both Phase 1A migrations without resetting the database.

## Applying migrations

Use `supabase db push` in a linked Supabase CLI project, or paste the migration into the Supabase SQL editor. The signup trigger atomically creates a profile, starter organization, and owner membership. Back up production data before future schema changes.
