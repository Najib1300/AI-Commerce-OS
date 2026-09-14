# Phase 1A

Phase 1E delivers checkout, mock payment verification, immutable order snapshots, secure confirmations, and merchant order visibility. Supplier fulfillment remains deferred to Phase 1F.

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

## Phase 1C

Brand Creation is implemented after product selection. It generates three validated directions by default, supports deterministic mock and OpenAI providers, compares and selects one direction, allows server-validated editing, records audit events, and finalizes an approved brand. Approval visually unlocks Store Creation without implementing it. See `docs/BRAND-CREATION.md`.
# Phase 1D — Store Builder

Structured generation, deterministic mock/OpenAI providers, editing, preview, approval, publishing, and public storefront rendering are implemented locally. Checkout remains out of scope.
