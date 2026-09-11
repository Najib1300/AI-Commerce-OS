# Phase 1A

## Included

- Supabase email/password authentication and password reset
- JSON-based signup endpoint with content-type-aware client error handling
- Automatic profile creation plus transactional, idempotent organization and owner-membership provisioning during onboarding
- Organization onboarding
- Protected SaaS dashboard with database-backed counts, usage, and activity
- Business creation, list, and overview
- Product Research shown as the Phase 1B entry point
- Locked/Coming Soon states for later capabilities
- Zod validation, RLS, tenant-scoped helpers, Vitest, and Playwright coverage

## Phase 1B

Product Research is implemented with tenant-scoped research runs and opportunities, a replaceable OpenAI provider, structured validation, application-owned pricing and scoring, usage tracking, failure cleanup, product selection, and Brand Creation unlock state. AI-supplied market values are labeled as estimates. See `docs/PRODUCT-RESEARCH.md`.

An explicit deterministic mock provider supports complete workflow testing without OpenAI credits. It preserves the production RPC and authorization path, records zero paid usage, and visibly labels synthetic results. Mock mode does not implement or begin Phase 1C.

Brand Creation, Store Builder, advertising, supplier ordering, and social publishing remain out of scope.
