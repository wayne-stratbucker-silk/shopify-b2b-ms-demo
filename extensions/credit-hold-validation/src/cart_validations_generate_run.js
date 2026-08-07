// @ts-check

/**
 * Cart & Checkout Validation Function — blocks B2B checkout when the purchasing
 * company (or its location) is on credit hold, and optionally when the order
 * exceeds a per-company credit limit.
 *
 * Target: cart.validations.generate.run  (export: cart_validations_generate_run)
 *
 * The credit-hold signal is the SAME `b2b.credit_hold` Company metafield the app
 * already writes and reads (lib/b2b/credit.ts). Enforcing it here — server-side,
 * inside Shopify's own checkout — means it cannot be bypassed by a buyer going
 * through native B2B checkout, unlike the app-layer gate in lib/checkout/express.ts
 * which only covers the app's own express-checkout flow.
 *
 * @typedef {import("../generated/api").CartValidationsGenerateRunInput} CartValidationsGenerateRunInput
 * @typedef {import("../generated/api").CartValidationsGenerateRunResult} CartValidationsGenerateRunResult
 * @typedef {import("../generated/api").ValidationError} ValidationError
 */

// Validate at checkout only — never block plain cart building.
const CHECKOUT_STEPS = new Set(["CHECKOUT_INTERACTION", "CHECKOUT_COMPLETION"]);

/**
 * @param {CartValidationsGenerateRunInput} input
 * @returns {CartValidationsGenerateRunResult}
 */
export function cartValidationsGenerateRun(input) {
  /** @type {ValidationError[]} */
  const errors = [];

  const purchasingCompany = input.cart?.buyerIdentity?.purchasingCompany;
  const company = purchasingCompany?.company;
  const location = purchasingCompany?.location;
  const step = input.buyerJourney?.step ?? "";

  // Only gate B2B checkouts (company present) and only at the checkout steps.
  if (company && CHECKOUT_STEPS.has(step)) {
    const onHold =
      isTrue(company.creditHold?.value) || isTrue(location?.creditHold?.value);

    if (onHold) {
      errors.push({
        message:
          "This account is on credit hold. Please contact your account manager or settle outstanding invoices before placing new orders.",
        target: "$.cart",
      });
    }

    // Optional per-order credit ceiling. Populate `b2b.credit_limit` from a real
    // ERP feed or a native store-credit account; when the metafield is absent this
    // check is a no-op. NOTE: this compares against the order subtotal, not
    // (limit − AR balance) — swap in available credit once it lives on a company
    // metafield or StoreCreditAccount.
    const limit = parseMoney(company.creditLimit?.value);
    const subtotal = parseMoney(input.cart?.cost?.subtotalAmount?.amount);
    if (limit !== null && subtotal !== null && subtotal > limit) {
      errors.push({
        message:
          `This order (${subtotal.toFixed(2)}) exceeds your available credit limit of ` +
          `${limit.toFixed(2)}. Reduce the order total or contact your account manager.`,
        target: "$.cart",
      });
    }
  }

  return { operations: [{ validationAdd: { errors } }] };
}

/**
 * @param {string | null | undefined} v
 * @returns {boolean}
 */
function isTrue(v) {
  return v === "true" || v === "1";
}

/**
 * @param {string | null | undefined} v
 * @returns {number | null}
 */
function parseMoney(v) {
  if (v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
