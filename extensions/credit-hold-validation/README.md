# Credit-hold checkout validation (Shopify Function)

A [Cart & Checkout Validation Function](https://shopify.dev/docs/api/functions/latest/cart-and-checkout-validation)
(`cart.validations.generate.run`) that **blocks checkout when the purchasing B2B
company is on credit hold**, and optionally when an order exceeds a per-company
credit limit.

## Why this exists

The Next.js app already gates its **own** express-checkout flow on credit hold
(`lib/checkout/express.ts` → `isOnCreditHold`). But that check lives in app code,
so a buyer going through Shopify's **native B2B checkout** (Storefront cart →
`checkoutUrl`) never hits it. A validation Function runs **server-side inside
Shopify's checkout**, so the rule holds no matter how checkout is reached — it
can't be bypassed.

It reads the same signal the app writes: the **`b2b.credit_hold` Company
metafield** (see `lib/b2b/credit.ts` → `readHoldOverride`). No new source of
truth is introduced.

## How it decides

At the `CHECKOUT_INTERACTION` / `CHECKOUT_COMPLETION` steps, for carts with a
purchasing company:

1. **Credit hold** — if `b2b.credit_hold` on the company *or* its location is
   `"true"`/`"1"`, checkout is blocked with a clear message.
2. **Credit ceiling (optional)** — if a `b2b.credit_limit` metafield is present
   and the cart subtotal exceeds it, checkout is blocked. Absent metafield ⇒
   no-op. This compares against the **subtotal**, not `limit − AR balance`; wire
   in real available credit once it lives on a metafield or a native
   [store-credit account](https://shopify.dev/changelog/store-credit-now-supports-company-locations-as-account-owners-in-admin-and-customer-apis).

D2C carts (no purchasing company) are never affected.

## This is not wired into the Next.js app

Shopify Functions compile to Wasm and are deployed from a **Shopify app**, not
from this Next.js project. This folder is a self-contained, ready-to-deploy
extension. To ship it:

```bash
# From a Shopify app that targets this store (create one with `shopify app init`
# if you don't have one — the app just hosts the function; it needs no UI):
cp -r extensions/credit-hold-validation <your-shopify-app>/extensions/

cd <your-shopify-app>
shopify app function typegen     # generates src/../generated/api from the input query
shopify app build
shopify app deploy               # uploads the function to the store
```

Then **activate** the validation (once per store) so checkout runs it — either
in **Settings → Checkout → Checkout rules → Add rule**, or via the Admin API:

```graphql
mutation {
  validationCreate(validation: {
    functionId: "<FUNCTION_ID from `shopify app deploy` / the Partners dashboard>"
  }) {
    validation { id }
    userErrors { field message }
  }
}
```

## Metafield access

For the function to read `b2b.credit_hold` / `b2b.credit_limit`, the deploying
app needs read access to those **Company / CompanyLocation** metafields. Create
metafield definitions that grant it, e.g.:

- Owner type **`COMPANY`** (and **`COMPANY_LOCATION`**), namespace **`b2b`**,
  keys **`credit_hold`** (`boolean`) and **`credit_limit`** (`number_decimal`),
  with the app granted read access.

Alternatively, move the flag into the function-app's reserved (`$app:`) namespace
if you prefer app-owned metafields, and update the input query's `namespace`
accordingly.

## Local testing

```bash
shopify app function run   # feed it a sample input.json to preview operations
```

A sample input that should block:

```json
{
  "cart": {
    "cost": { "subtotalAmount": { "amount": "5000.00" } },
    "buyerIdentity": {
      "purchasingCompany": {
        "company": {
          "id": "gid://shopify/Company/1",
          "name": "Acme Electrical",
          "creditHold": { "value": "true" },
          "creditLimit": { "value": "25000.00" }
        },
        "location": { "id": "gid://shopify/CompanyLocation/1", "creditHold": null }
      }
    }
  },
  "buyerJourney": { "step": "CHECKOUT_COMPLETION" }
}
```

## Files

| File | Purpose |
| --- | --- |
| `shopify.extension.toml` | Extension config — target, input query, export, build. |
| `src/cart_validations_generate_run.graphql` | Input query (what the function reads). |
| `src/cart_validations_generate_run.js` | Validation logic. |
| `package.json` | CLI script aliases (`typegen`/`build`/`preview`). |
