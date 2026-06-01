import { adminQuery } from "@/lib/shopify/admin-client";
import type { Quote, QuoteItem, QuoteMessage, QuoteStatus, QuoteStatusKind } from "@/types";

const QUOTE_NAMESPACE = "quote";
const QUOTE_TAG = "b2b-quote";

const DRAFT_ORDER_FIELDS = `
  id
  name
  status
  createdAt
  updatedAt
  invoiceUrl
  totalPriceSet { shopMoney { amount currencyCode } }
  lineItems(first: 50) {
    edges {
      node {
        id
        title
        quantity
        originalUnitPriceSet { shopMoney { amount } }
        discountedUnitPriceSet { shopMoney { amount } }
        variant { id sku product { handle title vendor featuredImage { url } } }
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
  metafields(identifiers: [
    { namespace: "quote", key: "status" },
    { namespace: "quote", key: "title" },
    { namespace: "quote", key: "reference_number" },
    { namespace: "quote", key: "expires_at" },
    { namespace: "quote", key: "notes_thread" }
  ]) { namespace key value }
`;

function getMeta(metafields: Array<{ namespace: string; key: string; value: string } | null>, key: string): string {
  return (metafields ?? []).filter(Boolean).find(
    (m) => m!.namespace === QUOTE_NAMESPACE && m!.key === key,
  )?.value ?? "";
}

function statusLabel(status: QuoteStatus): string {
  const labels: Record<QuoteStatus, string> = {
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
  if (status === "new") return "info";
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
        customerId: input.customerId,
        purchasingEntity: input.companyLocationId
          ? {
              purchasingCompany: {
                companyId: input.companyId,
                companyLocationId: input.companyLocationId,
                companyContactId: input.companyContactId,
              },
            }
          : undefined,
        poNumber: input.poNumber,
        note: input.notes,
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
