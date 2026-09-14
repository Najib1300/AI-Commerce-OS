# Checkout, Payments, and Orders

Phase 1E adds a public, single-product checkout and tenant-scoped merchant orders. A shopper can buy only the selected product attached to a published store, with quantity limited to 1–10.

## Security and price authority

The browser supplies a store slug, quantity, and delivery details—not prices, totals, currency, tenant IDs, or product IDs. `create_checkout_session` resolves the published store and selected product, converts the trusted catalog price to integer minor units, and calculates all totals. Shipping, tax, and discounts are zero in this phase.

Commerce tables use RLS. Anonymous users have no direct table access; authenticated organization members have tenant-scoped `SELECT` only. Writes use narrow `SECURITY DEFINER` RPCs with an empty search path and composite tenant foreign keys. Customer and payment data never enter the public store payload.

## State and idempotency

Checkout moves from `created` to `awaiting_payment`, then to `paid`, `failed`, or `cancelled`; paid is final. Successful payment atomically creates a confirmed, paid, unfulfilled order from immutable checkout snapshots. Unique checkout-to-order, provider transaction, and provider event constraints prevent duplicate orders and replay. Order numbers use a PostgreSQL sequence and are display identifiers, not authorization secrets.

Confirmation requires an independent random token and returns only receipt fields—never UUIDs, tenant IDs, payment secrets, provider metadata, or research data.

## Providers and webhooks

`providers/payments` defines `createPayment`, `verifyPayment`, `parseWebhook`, and `refundPayment`. `PAYMENT_PROVIDER=mock` selects the deterministic adapter; unsupported values fail without fallback. Mock success, failure, cancellation, webhook, and refund behavior make no network calls and move no money.

The webhook route is `/api/payments/webhook/[provider]`. Mock payloads are strictly validated. Future Stripe, Paystack, and Flutterwave adapters must validate signatures and provider results before invoking lifecycle RPCs. Credential placeholders are documented but not required or populated.

## Orders, email, and limitations

Customer/address rows belong to the merchant business. Orders preserve customer, address, product, quantity, and money snapshots. `/orders` and `/orders/[id]` require a tenant session. Confirmation email has an optional service interface and defaults to a no-op; delivery failure cannot invalidate payment. Refund interfaces and persistence exist, but no refund UI is exposed.

Mock checkout displays **Test Payment** and mock receipts/orders display **Test Order**. Phase 1E has no card collection, live gateway, carrier rates, tax engine, coupons, customer accounts, inventory sync, supplier fulfillment, or distributed rate limiter. A database-backed rapid-duplicate guard is included; production-scale rate limiting remains future work.
