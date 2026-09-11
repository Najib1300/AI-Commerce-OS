# AI Commerce OS

AI Commerce OS is a multi-tenant SaaS foundation for creating and operating ecommerce businesses. Phase 1A provides secure authentication, workspace onboarding, a dashboard, and business setup. Shopify, payments, suppliers, automation, and AI generation are intentionally out of scope.
Phase 1B adds Product Research, and Phase 1C adds a secure Brand Creation workflow from selected product through editable brand approval and the visual Store Creation handoff.

## Setup

1. Install dependencies with `npm install`.
2. Create a Supabase project and copy `.env.example` to `.env.local`.
3. Set `NEXT_PUBLIC_SUPABASE_URL` to the Supabase Project URL (`https://<project-ref>.supabase.co`), set the anon key, and set `NEXT_PUBLIC_SITE_URL` to the application origin. Never use the Hostinger application URL as the Supabase URL. Keep service-role and OpenAI keys server-only.
4. Apply every SQL file in `supabase/migrations/` in filename order using the Supabase CLI or SQL editor. Existing projects must apply `202609110001_create_initial_workspace.sql` before deploying the matching application code.
5. Configure Supabase Auth's Site URL for the deployed origin and allow both its `/auth/callback` URL and `http://localhost:3000/auth/callback`.
6. Run `npm run dev`.

## Product research provider

`AI_PROVIDER=openai` is the default and uses the server-only `OPENAI_API_KEY` plus `OPENAI_MODEL`. For deterministic workflow testing without API usage, explicitly set `AI_PROVIDER=mock`. Mock results are visibly marked as test data, record zero tokens, and must never be treated as live market evidence. Switching back requires only `AI_PROVIDER=openai`; never expose provider credentials to the browser.

## Commands

- `npm run lint` — lint the repository
- `npm run typecheck` — strict TypeScript validation
- `npm test` — unit tests
- `npm run test:e2e` — Playwright journey (requires disposable `E2E_USER_EMAIL` and `E2E_USER_PASSWORD`)
- `npm run build` — production build

See [Architecture](docs/ARCHITECTURE.md), [Database](docs/DATABASE.md), and [Phase 1](docs/PHASE-1.md).
Brand workflow details are in [Brand Creation](docs/BRAND-CREATION.md).
