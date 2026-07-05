/* eslint-disable @typescript-eslint/no-explicit-any */
import { adminQuery } from "@/lib/shopify/admin-client";
import type { Quote, QuoteItem, QuoteMessage, QuoteStatus, QuoteStatusKind } from "@/types";

const QUOTE_NAMESPACE = "quote";
const QUOTE_TAG = "b2b-quote";
const CART_TAG = "b2b-quote-cart";

const DRAFT_ORDER_FIELDS = `
  id
  name
  status
  createdAt
  updatedAt
  invoiceUrl
  totalPriceSet { shopMoney { amount currencyCode } }
  shippingAddress { firstName lastName company address1 address2 city province zip country phone }
  lineItems(first: 50) {
    edges {
      node {
        id
        title
        quantity
        originalUnitPriceSet { shopMoney { amount } }
        discountedUnitPriceSet { shopMoney { amount } }
        variant { id sku product { id handle title vendor featuredImage { url } } }
      }
    }
  }
  customer { id email firstName lastName }
  purchasingEntity {
    ... on PurchasingCompany {
      company { id name }
      location { id name }
      contact { id }
    }
  }
  poNumber
  note
  tags
  metafields(first: 20, namespace: "quote") { edges { node { namespace key value } } }
`;

// 2026-07: Admin metafields no longer accepts `identifiers` and is a connection.
function getMeta(
  metafields: { edges: Array<{ node: { namespace: string; key: string; value: string } }> } | null | undefined,
  key: string,
): string {
  const nodes = metafields?.edges?.map((e) => e.node) ?? [];
  return nodes.find((m) => m.namespace === QUOTE_NAMESPACE && m.key === key)?.value ?? "";
}

function statusLabel(status: QuoteStatus): string {
  const labels: Record<QuoteStatus, string> = {
    draft: "Draft",
    new: "Awaiting Review",
    in_process: "Quote Ready",
    updated_by_buyer: "Updated — Pending Review",
    ordered: "Ordered",
    expired: "Expired",
    archived: "Archived",
  };
  return labels[status] ?? "Unknown";
}

function statusKind(status: QuoteStatus): QuoteStatusKind {
  if (status === "in_process" || status === "updated_by_buyer") return "ok";
  if (status === "new" || status === "draft") return "info";
  if (status === "ordered") return "muted";
  if (status === "expired") return "err";
  return "muted";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDraftOrder(node: any): Quote {
  const status = (getMeta(node.metafields, "status") || "new") as QuoteStatus;
  const notesRaw = getMeta(node.metafields, "notes_thread");
  let messages: QuoteMessage[] = [];
  try { messages = notesRaw ? JSON.parse(notesRaw) : []; } catch { /* ignore */ }

  const items: QuoteItem[] = node.lineItems.edges.map((e: any) => ({
    sku: e.node.variant?.sku ?? e.node.title,
    name: e.node.title,
    qty: e.node.quantity,
    listPrice: parseFloat(e.node.originalUnitPriceSet?.shopMoney?.amount ?? "0"),
    quotedPrice: parseFloat(e.node.discountedUnitPriceSet?.shopMoney?.amount ?? "0"),
    total: e.node.quantity * parseFloat(e.node.discountedUnitPriceSet?.shopMoney?.amount ?? "0"),
    variantId: e.node.variant?.id,
    imageUrl: e.node.variant?.product?.featuredImage?.url,
    lineItemId: e.node.id,
    productId: e.node.variant?.product?.id,
    productHandle: e.node.variant?.product?.handle,
  }));

  const allowCheckout = status === "in_process" && !!node.invoiceUrl;
  const repName = node.purchasingEntity?.contact?.id ? "Sales Rep" : "Sales Team";
  const buyerName = node.customer ? `${node.customer.firstName ?? ""} ${node.customer.lastName ?? ""}`.trim() : "";

  return {
    id: node.id,
    draftOrderName: node.name,
    date: node.createdAt,
    title: getMeta(node.metafields, "title") || undefined,
    rep: repName,
    buyer: buyerName,
    total: parseFloat(node.totalPriceSet?.shopMoney?.amount ?? "0"),
    expires: getMeta(node.metafields, "expires_at") || undefined,
    status,
    statusKind: statusKind(status),
    statusLabel: statusLabel(status),
    allowCheckout,
    invoiceUrl: node.invoiceUrl ?? undefined,
    items: items.length,
    quoteItems: items,
    messages,
    poNumber: node.poNumber ?? undefined,
    referenceNumber: getMeta(node.metafields, "reference_number") || undefined,
    notes: node.note ?? undefined,
    companyLocationId: node.purchasingEntity?.location?.id ?? undefined,
  };
}

export async function getQuote(draftOrderId: string): Promise<Quote | null> {
  const data = await adminQuery<{ draftOrder: unknown | null }>(
    `query GetDraftOrder($id: ID!) { draftOrder(id: $id) { ${DRAFT_ORDER_FIELDS} } }`,
    { id: draftOrderId },
  );
  if (!data.draftOrder) return null;
  return mapDraftOrder(data.draftOrder);
}

export async function getQuotesForCompany(companyId: string, first = 50): Promise<Quote[]> {
  const query = `tag:${QUOTE_TAG} company_id:${companyId.replace("gid://shopify/Company/", "")}`;
  const data = await adminQuery<{
    draftOrders: { edges: Array<{ node: unknown }> };
  }>(
    `query GetCompanyQuotes($query: String!, $first: Int!) {
      draftOrders(first: $first, query: $query, sortKey: UPDATED_AT, reverse: true) {
        edges { node { ${DRAFT_ORDER_FIELDS} } }
      }
    }`,
    { query, first },
  );
  return data.draftOrders.edges.map((e) => mapDraftOrder(e.node));
}

export async function getQuotesForCustomer(customerId: string, first = 50): Promise<Quote[]> {
  const id = customerId.replace("gid://shopify/Customer/", "");
  const query = `tag:${QUOTE_TAG} customer_id:${id}`;
  const data = await adminQuery<{
    draftOrders: { edges: Array<{ node: unknown }> };
  }>(
    `query GetCustomerQuotes($query: String!, $first: Int!) {
      draftOrders(first: $first, query: $query, sortKey: UPDATED_AT, reverse: true) {
        edges { node { ${DRAFT_ORDER_FIELDS} } }
      }
    }`,
    { query, first },
  );
  return data.draftOrders.edges.map((e) => mapDraftOrder(e.node));
}

// ─── Persistent Quote Cart (Draft Orders tagged b2b-quote-cart) ───

export interface CartLineItemInput {
  variantId: string;
  quantity: number;
  originalUnitPrice: string;
  title?: string;
}

export async function createCartDraftOrder(
  customerId: string,
  lineItems: CartLineItemInput[],
  opts?: {
    companyId?: string;
    companyLocationId?: string;
    companyContactId?: string;
  },
): Promise<{ id: string }> {
  const data = await adminQuery<{
    draftOrderCreate: {
      draftOrder: { id: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation CreateCartDraftOrder($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id }
        userErrors { field message }
      }
    }`,
    {
      input: {
        lineItems,
        // 2026-07: draftOrderCreate rejects sending both customer and
        // purchasing_entity — use purchasingEntity for B2B, else customerId.
        ...(opts?.companyLocationId
          ? {
              purchasingEntity: {
                purchasingCompany: {
                  companyId: opts.companyId,
                  companyLocationId: opts.companyLocationId,
                  companyContactId: opts.companyContactId,
                },
              },
            }
          : { customerId }),
        tags: [CART_TAG],
        metafields: [
          { namespace: QUOTE_NAMESPACE, key: "status", value: "draft", type: "single_line_text_field" },
        ],
      },
    },
  );
  const errors = data.draftOrderCreate.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (!data.draftOrderCreate.draftOrder) throw new Error("Failed to create cart draft order");
  return { id: data.draftOrderCreate.draftOrder.id };
}

export async function updateCartDraftOrder(
  draftOrderId: string,
  lineItems: CartLineItemInput[],
): Promise<void> {
  await adminQuery(
    `mutation UpdateCartDraftOrder($id: ID!, $input: DraftOrderInput!) {
      draftOrderUpdate(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    { id: draftOrderId, input: { lineItems } },
  );
}

export async function deleteCartDraftOrder(draftOrderId: string): Promise<void> {
  try {
    await adminQuery(
      `mutation DeleteCartDraftOrder($input: DraftOrderDeleteInput!) {
        draftOrderDelete(input: $input) {
          deletedId
          userErrors { message }
        }
      }`,
      { input: { id: draftOrderId } },
    );
  } catch {
    // Swallow "not found" — the draft may have already been submitted or expired
  }
}

export async function findCartDraftOrderForCustomer(customerId: string): Promise<string | null> {
  const numericId = customerId.replace("gid://shopify/Customer/", "");
  const query = `tag:${CART_TAG} customer_id:${numericId} status:open`;
  const data = await adminQuery<{
    draftOrders: { edges: Array<{ node: { id: string } }> };
  }>(
    `query FindCartDraftOrder($query: String!) {
      draftOrders(first: 1, query: $query, sortKey: UPDATED_AT, reverse: true) {
        edges { node { id } }
      }
    }`,
    { query },
  );
  return data.draftOrders.edges[0]?.node.id ?? null;
}

export interface SubmitCartAsQuoteInput {
  title?: string;
  referenceNumber?: string;
  poNumber?: string;
  notes?: string;
  expiresAt?: string;
  shippingAddress?: MailingAddressInput;
  billingAddress?: MailingAddressInput;
}

export async function submitCartAsQuote(
  draftOrderId: string,
  input: SubmitCartAsQuoteInput,
): Promise<void> {
  await adminQuery(
    `mutation SubmitCartAsQuote($id: ID!, $input: DraftOrderInput!) {
      draftOrderUpdate(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    {
      id: draftOrderId,
      input: {
        tags: [QUOTE_TAG],
        poNumber: input.poNumber,
        note: input.notes,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress,
        metafields: [
          { namespace: QUOTE_NAMESPACE, key: "status", value: "new", type: "single_line_text_field" },
          { namespace: QUOTE_NAMESPACE, key: "title", value: input.title ?? "", type: "single_line_text_field" },
          { namespace: QUOTE_NAMESPACE, key: "reference_number", value: input.referenceNumber ?? "", type: "single_line_text_field" },
          { namespace: QUOTE_NAMESPACE, key: "expires_at", value: input.expiresAt ?? "", type: "single_line_text_field" },
          { namespace: QUOTE_NAMESPACE, key: "notes_thread", value: JSON.stringify([]), type: "json" },
        ],
      },
    },
  );
}

export interface MailingAddressInput {
  firstName?: string;
  lastName?: string;
  company?: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

export interface CreateQuoteInput {
  lineItems: Array<{
    variantId: string;
    quantity: number;
    originalUnitPrice: string;
    title?: string;
  }>;
  customerId: string;
  companyId?: string;
  companyLocationId?: string;
  companyContactId?: string;
  title?: string;
  referenceNumber?: string;
  poNumber?: string;
  notes?: string;
  expiresAt?: string;
  shippingAddress?: MailingAddressInput;
  billingAddress?: MailingAddressInput;
}

export async function createQuote(input: CreateQuoteInput): Promise<{ id: string; name: string }> {
  const now = new Date().toISOString();
  const data = await adminQuery<{
    draftOrderCreate: {
      draftOrder: { id: string; name: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation CreateDraftOrder($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id name }
        userErrors { field message }
      }
    }`,
    {
      input: {
        lineItems: input.lineItems,
        // 2026-07: draftOrderCreate rejects sending both customer and
        // purchasing_entity — use purchasingEntity for B2B, else customerId.
        ...(input.companyLocationId
          ? {
              purchasingEntity: {
                purchasingCompany: {
                  companyId: input.companyId,
                  companyLocationId: input.companyLocationId,
                  companyContactId: input.companyContactId,
                },
              },
            }
          : { customerId: input.customerId }),
        poNumber: input.poNumber,
        note: input.notes,
        shippingAddress: input.shippingAddress,
        billingAddress: input.billingAddress,
        tags: [QUOTE_TAG],
        metafields: [
          { namespace: QUOTE_NAMESPACE, key: "status", value: "new", type: "single_line_text_field" },
          { namespace: QUOTE_NAMESPACE, key: "title", value: input.title ?? "", type: "single_line_text_field" },
          { namespace: QUOTE_NAMESPACE, key: "reference_number", value: input.referenceNumber ?? "", type: "single_line_text_field" },
          { namespace: QUOTE_NAMESPACE, key: "expires_at", value: input.expiresAt ?? "", type: "single_line_text_field" },
          {
            namespace: QUOTE_NAMESPACE,
            key: "notes_thread",
            value: JSON.stringify([]),
            type: "json",
          },
        ],
      },
    },
  );

  const errors = data.draftOrderCreate.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (!data.draftOrderCreate.draftOrder) throw new Error("Failed to create draft order");

  return data.draftOrderCreate.draftOrder;
}

export async function addQuoteMessage(
  draftOrderId: string,
  existingMessages: QuoteMessage[],
  message: QuoteMessage,
): Promise<void> {
  const updated = [...existingMessages, message];
  await adminQuery(
    `mutation UpdateDraftOrderMeta($input: DraftOrderInput!, $id: ID!) {
      draftOrderUpdate(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    {
      id: draftOrderId,
      input: {
        metafields: [
          {
            namespace: QUOTE_NAMESPACE,
            key: "notes_thread",
            value: JSON.stringify(updated),
            type: "json",
          },
        ],
      },
    },
  );
}

export async function updateQuoteStatus(draftOrderId: string, status: QuoteStatus): Promise<void> {
  await adminQuery(
    `mutation UpdateDraftOrderStatus($id: ID!, $input: DraftOrderInput!) {
      draftOrderUpdate(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    {
      id: draftOrderId,
      input: {
        metafields: [
          {
            namespace: QUOTE_NAMESPACE,
            key: "status",
            value: status,
            type: "single_line_text_field",
          },
        ],
      },
    },
  );
}

export async function updateQuoteExpiry(draftOrderId: string, expiresAt: string): Promise<void> {
  await adminQuery(
    `mutation UpdateDraftOrderExpiry($id: ID!, $input: DraftOrderInput!) {
      draftOrderUpdate(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    {
      id: draftOrderId,
      input: {
        metafields: [
          {
            namespace: QUOTE_NAMESPACE,
            key: "expires_at",
            value: expiresAt,
            type: "single_line_text_field",
          },
        ],
      },
    },
  );
}

export async function updateQuoteLineItemPrice(
  draftOrderId: string,
  lineItemId: string,
  listPrice: number,
  newPrice: number,
): Promise<void> {
  const discount = Math.max(0, listPrice - newPrice);
  await adminQuery(
    `mutation UpdateLineItemPrice($id: ID!, $input: DraftOrderInput!) {
      draftOrderUpdate(id: $id, input: $input) {
        userErrors { message }
      }
    }`,
    {
      id: draftOrderId,
      input: {
        lineItems: [{
          id: lineItemId,
          appliedDiscount: discount > 0
            ? { valueType: "FIXED_AMOUNT", value: discount, description: "Negotiated price" }
            : null,
        }],
      },
    },
  );
}

export async function sendQuoteInvoice(draftOrderId: string): Promise<{ invoiceUrl: string }> {
  const data = await adminQuery<{
    draftOrderInvoiceSend: {
      draftOrder: { id: string; invoiceUrl: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation SendDraftOrderInvoice($id: ID!) {
      draftOrderInvoiceSend(id: $id) {
        draftOrder { id invoiceUrl }
        userErrors { message }
      }
    }`,
    { id: draftOrderId },
  );
  const errors = data.draftOrderInvoiceSend.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  return { invoiceUrl: data.draftOrderInvoiceSend.draftOrder?.invoiceUrl ?? "" };
}

export async function completeDraftOrder(
  draftOrderId: string,
  paymentPending = true,
): Promise<{ orderId: string; orderStatusUrl: string; orderName: string }> {
  const data = await adminQuery<{
    draftOrderComplete: {
      draftOrder: {
        id: string;
        order: { id: string; statusUrl: string; name: string } | null;
      } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation CompleteDraftOrder($id: ID!, $paymentPending: Boolean) {
      draftOrderComplete(id: $id, paymentPending: $paymentPending) {
        draftOrder {
          id
          order { id statusUrl name }
        }
        userErrors { field message }
      }
    }`,
    { id: draftOrderId, paymentPending },
  );
  const errors = data.draftOrderComplete.userErrors;
  if (errors.length) throw new Error(errors.map((e) => e.message).join("; "));
  if (!data.draftOrderComplete.draftOrder) throw new Error("Draft order not found");
  const order = data.draftOrderComplete.draftOrder.order;
  if (!order) throw new Error("Shopify did not return an order — the draft order may already be completed");
  return { orderId: order.id, orderStatusUrl: order.statusUrl, orderName: order.name };
}
