# Architecture

The Next.js App Router is split into server-rendered routes, reusable client UI, server actions, validation, data access, and Supabase infrastructure.

## Folder structure

- `app/`: routes, layouts, loading/error boundaries, and route handlers
- `components/`: reusable design-system and shell components
- `lib/actions/`: validated mutations
- `lib/supabase/`: browser, server, and middleware clients
- `lib/data.ts`: tenant-scoped database reads
- `types/`: domain types
- `supabase/migrations/`: PostgreSQL schema and RLS
- `tests/`: Vitest unit and Playwright journey tests
- `agents/`: server-only AI workflows and replaceable provider boundaries
- `providers/`: reserved for later third-party provider adapters

Server Components perform reads. Most validated writes use Server Actions; signup uses the explicit JSON route `POST /api/auth/signup` so deployment/proxy failures can be handled safely before parsing. Middleware bypasses public authentication pages, the signup API, and the callback, and refreshes sessions only for protected route families. RLS remains the final authorization boundary; every organization-scoped query also filters by the current member's organization.

Phase 1B adds `agents/product-research/`, whose provider interface keeps OpenAI replaceable and tests offline. Validation, prompt construction, model access, pricing, scoring, persistence, and lifecycle cleanup are separate modules. Product Research mutations remain server-only and derive tenancy from the authenticated membership. Future supplier, marketplace, trend, advertising, demand, and competitor evidence providers can feed the same orchestration boundary.
