# Store Builder

Phase 1D turns the selected product and approved brand into validated storefront data. The agent returns JSON only; application-owned React components render the same blocks in private preview and the public store.

The workflow is `ready → generating → generated → approved → published`. Failures preserve prior work. PostgreSQL enforces one active generation and one store per business.

Store runs, stores, sections, and pages use composite tenant foreign keys. Members receive scoped reads; mutations use narrow authenticated RPCs with empty search paths. Public access is limited to published presentation data.

Allowed blocks are hero, featured product, benefits, product details, trust, testimonials, FAQ, newsletter, and footer. Themes contain validated design tokens, never CSS. Required pages are home, product, about, contact, FAQ, shipping, returns, privacy, and terms. The private preview and public route share `StoreRenderer`.

`AI_PROVIDER=openai` validates structured output and keeps the key server-side. `AI_PROVIDER=mock` is deterministic, shows Test Data, uses `mock-store-generation`, and records zero tokens. Testimonials are disabled placeholders and policies are visibly marked as drafts.

Checkout, payments, fulfillment, inventory, customer accounts, images, custom domains, subdomains, remote fonts, advanced SEO, and marketing automation remain out of scope.
