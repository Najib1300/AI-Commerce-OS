# Product Research

## Workflow

An authenticated member selects one of their tenant-scoped businesses at `/product-research`, supplies research criteria, and starts a synchronous server-side research run. The application creates a `product_research_runs` row and matching `ai_jobs` row, marks both running, requests structured proposals through the provider boundary, validates the response, calculates pricing and scores, stores opportunities, records token usage, and completes both records. A failure marks both records failed and removes partial opportunity rows.

Results are shown at `/businesses/[id]/research`; details are at `/businesses/[id]/research/[opportunityId]`. Selecting a product completes Product Research and visually unlocks Brand Creation without implementing that later phase.

## Agent architecture

`agents/product-research` separates input/output validation, prompt construction, the provider contract and OpenAI adapter, pricing, deterministic scoring, execution orchestration, and Supabase persistence. Tests inject a fake `ProductResearchProvider`; they never call OpenAI.

The current provider uses `OPENAI_API_KEY` only on the server and defaults to `gpt-4.1-mini`. `OPENAI_MODEL` may override the model. Structured JSON is validated with Zod before persistence. Prompts and credentials are never stored in user-visible records.

## Inputs and output

Inputs include business ID, country, selling market, niche, budget, maximum supplier cost, preferred selling price, and requested product count. The server accepts 1–10 products. Browser-supplied organization or user IDs are not accepted.

Each proposal includes descriptive fields, estimated prices, six model-generated component scores, reasoning, keywords, marketing angles, and risks. Demand, competition, trend, supplier cost, marketing, shipping, and risk values are explicitly labeled as AI-generated estimates rather than verified market data.

## Pricing and scoring

Gross margin percentage is calculated in application code:

`((suggested price - supplier cost) / suggested price) × 100`

Invalid or zero selling prices return a safe 0. Margin score is a linear mapping where 0% margin scores 0 and 60% margin scores 100, clamped to 0–100.

Overall score is calculated by the application, never the model:

- Demand: 25%
- Competition opportunity (`100 - competition`): 15%
- Trend: 15%
- Margin: 15%
- Marketing potential: 15%
- Shipping suitability: 10%
- Risk opportunity (`100 - risk`): 5%

The weighted result is rounded to two decimals and clamped to 0–100.

## Security and reliability

RLS gives organization members read access to both research tables but no direct insert, update, or delete access. Narrow `SECURITY DEFINER` lifecycle RPCs authenticate with `auth.uid()`, use an empty search path, derive the organization from the business/run, verify membership through fully qualified tables, and enforce valid state transitions. Composite foreign keys prevent mixing businesses, runs, and organizations. A partial unique index permits only one queued/running run per business. Another partial unique index plus an advisory-locked selection RPC permits only one selected product per business.

Successful usage is stored in `usage_records` with model, input/output/total tokens, and research run ID. Detailed provider/database errors are logged server-side; users receive safe messages. Failed runs and jobs receive terminal states so work is not left running.

## Current limitations and live-data evolution

Execution is synchronous because no durable worker is included yet. A production queue/worker should call the same provider and persistence contracts for longer workloads. The current model proposes hypotheses without supplier catalogs, marketplaces, trend feeds, advertising intelligence, search demand, or competitor datasets. Those evidence providers can be added before the AI synthesis step without making the LLM the permanent source of market truth.
