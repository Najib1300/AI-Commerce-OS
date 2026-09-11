# Brand Creation

Phase 1C begins only after a completed Product Research run has exactly one selected product. An authenticated organization member can generate up to five brand directions (three by default), compare them, reject or select one, edit the selected direction, and approve it. Approval visually unlocks Store Creation; Store Creation itself is not implemented.

## Architecture and providers

`agents/brand/` separates types, Zod validation, prompt construction, OpenAI and deterministic mock providers, provider selection, lifecycle execution, and Supabase persistence. `AI_PROVIDER=openai` uses the server-only `OPENAI_API_KEY` and shared `OPENAI_MODEL`. `AI_PROVIDER=mock` returns deterministic fixtures with model `mock-brand-generation` and zero tokens. Provider failure never falls back to mock, and no automated test contacts OpenAI.

Both providers return the same validated schema: identity and positioning, customer pain points, value proposition, personality, structured voice guidance, a validated three-color hex palette, typography, logo concept, visual style, domain and handle suggestions, about copy, and store design direction. Generated names and availability suggestions are creative inputs only—not trademark, legal, domain, or social-handle clearance. Logo image generation is out of scope.

## Data and state machines

`brand_generation_runs` records the organization, business, selected product, provider/model, preferences, lifecycle, and errors. `brand_directions` stores the complete editable brand system. Composite foreign keys prevent organization, business, run, and selected-product mismatches.

- Run: `queued → running → completed | failed`
- Direction: `generated → selected | rejected`; a prior selection returns to `generated`; `selected → approved`

Partial unique indexes permit one active run, one selected direction, and one approved direction per business. Rejected directions cannot be selected and approvals are final in Phase 1C.

## Security and persistence

RLS permits organization members to read only their tenant's runs and directions. Authenticated clients receive no direct mutation grants. Narrow `SECURITY DEFINER` RPCs use an empty search path, schema-qualified references, `auth.uid()`, membership checks, locked state transitions, and tenant-derived identifiers. The browser never supplies an organization ID as authorization truth.

The start and completion RPCs share the existing `ai_jobs` lifecycle. Successful generations create `usage_records` with `usage_type=brand_generation`, provider, model, token counts, and run ID. Mock runs record quantity zero, so paid usage remains unchanged. Selection, rejection, editing, and approval write compact audit events without prompts or secrets.

## Editing and handoff

Only the selected direction is editable. All fields are validated server-side before the update RPC runs. Approval requires a selected direction from a completed run. The business stays in the existing `building` state; the overview shows the approved name, tagline, primary color, and an unlocked Store Creation card for the future phase.

## Limitations

Generation is synchronous and should move to a worker before heavier integrations. Trademark, domain, social-handle, and legal verification require future evidence providers. Phase 1C does not implement Store Builder, SEO, logo images, marketing automation, or suppliers.
