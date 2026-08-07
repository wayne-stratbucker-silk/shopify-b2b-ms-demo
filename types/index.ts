// ─── Core data models for Shopify B2B Makeswift Demo ───

export type BadgeKind = "new" | "best" | "bulk" | "ship" | "sale" | "low";
export type StatusKind = "ok" | "warn" | "err" | "info" | "muted";
export type UserRole = "admin" | "buyer";
export type AddressType = "ship" | "bill";
export type PaymentMethod = "net30" | "net60" | "cc" | "po";

// ─── Product ───
export interface PricingTier {
  minQty: number;
  unitPrice: number;
}

export interface Product {
  id: string;                 // Shopify GID: gid://shopify/Product/...
  variantId?: string;         // Shopify GID: gid://shopify/ProductVariant/...
  handle: string;             // Shopify handle (replaces BigCommerce 'path')
  sku: string;
  customerSku?: string;       // per-Company overlay from Company metafield
  mpn?: string;
  upc?: string;
  name: string;
  brand: string;              // Shopify product.vendor
  category: string;           // collection handle
  description?: string;
  warranty?: string;
  price: number;
  listPrice: number;
  wasSalePrice?: number;
  msrp?: number;
  uom: string;                // unit of measure from product metafield
  stockQty: number;
  available?: boolean;        // Shopify availableForSale — purchasable even at qty 0
                              // (continue-selling / untracked). Trust over stockQty.
  leadTime: string;
  leadTimeDays?: number;
  badges: BadgeKind[];
  tiers: PricingTier[];       // from Shopify quantityRules on variant
  warehouses?: { name: string; qty: number; locationId?: string }[];
  specs?: Record<string, string>;
  materials?: string[];
  documents?: { name: string; url: string; filename: string; size: string }[];
  specSheetUrl?: string;
  installGuideUrl?: string;
  cadFileUrl?: string;
  images?: string[];
  galleryImages?: { url: string; alt: string; sortOrder: number }[];
  videos?: { id: string; title: string }[];
  lowStockLevel?: number;
  trackInventory?: boolean;
  rating?: number;
  reviewCount?: number;
}

// ─── Company / Account ───
export interface SalesRep {
  name: string;
  title: string;
  email: string;
  phone: string;
  initials: string;
}

export interface Company {
  id: string;                 // Shopify Company GID
  name: string;
  accountNumber: string;
  priceGroup: string;
  netTerms: string;
  creditLimit: number;        // from Company metafield credit_limit
  usedCredit: number;
  assignedRep: SalesRep;
}

export interface CompanyLocation {
  id: string;                 // Shopify CompanyLocation GID
  name: string;
  address?: Address;
}

// ─── Company User / Contact ───
export interface CompanyUser {
  id: string;                 // Shopify CompanyContact GID
  customerId: string;         // linked Shopify Customer GID
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  title: string;
  lastSeen: string;
  companyId?: string;
  totalSpend?: number;
}

// ─── Address ───
export interface Address {
  id?: string;
  label?: string;
  isDefault?: boolean;
  type?: AddressType;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  contact?: string;
  phone?: string;
  hours?: string;
}

// ─── Order ───
export type OrderStatus = "ok" | "info" | "warn" | "err" | "muted";

export interface OrderItem {
  sku: string;
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Order {
  id: string;                 // Shopify Order GID
  shopifyOrderId: string;     // human-readable order name (#1001)
  date: string;
  poNumber: string;
  buyer: string;
  total: number;
  status: OrderStatus;
  statusLabel: string;
  financialStatus: string;    // PENDING | AUTHORIZED | PAID | REFUNDED | VOIDED
  fulfillmentStatus: string;  // UNFULFILLED | PARTIAL | FULFILLED
  items: number;
  orderItems?: OrderItem[];
  shipTo: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shipMethod?: string;
  eta?: string;
}

// ─── Quote (backed by Shopify Draft Order) ───
export type QuoteStatus =
  | "draft"
  | "new"
  | "in_process"
  | "updated_by_buyer"
  | "ordered"
  | "expired"
  | "archived";

export type QuoteStatusKind = "ok" | "info" | "warn" | "muted" | "err";

export interface QuoteItem {
  sku: string;
  name: string;
  qty: number;
  listPrice: number;
  quotedPrice: number;
  total: number;
  variantId?: string;
  imageUrl?: string;
  /** Shopify Draft Order line item GID — used for inline price editing. */
  lineItemId?: string;
  /** Shopify Product GID — used for quote duplication. */
  productId?: string;
  /** Product handle — used for quote duplication. */
  productHandle?: string;
}

export interface QuoteMessage {
  author: string;
  authorRole: "rep" | "buyer";
  date: string;
  body: string;
}

export interface Quote {
  id: string;                 // Shopify Draft Order GID
  draftOrderName: string;     // e.g. "#D1234"
  date: string;
  title?: string;             // from metafield quote.title
  rep: string;
  buyer: string;
  total: number;
  expires?: string;           // from metafield quote.expires_at
  status: QuoteStatus;
  statusKind: QuoteStatusKind;
  statusLabel: string;
  allowCheckout: boolean;     // true when status=in_process and invoiceUrl exists
  invoiceUrl?: string;        // Shopify draft order invoice URL
  items: number;
  quoteItems?: QuoteItem[];
  messages?: QuoteMessage[];  // from metafield quote.notes_thread (JSON)
  poNumber?: string;
  referenceNumber?: string;   // from metafield quote.reference_number
  notes?: string;
  companyLocationId?: string;
}

// ─── Invoice (derived from orders with paymentTerms) ───
export type InvoiceStatus = "ok" | "info" | "warn" | "err";

export interface Invoice {
  id: string;
  date: string;
  orderId: string;
  orderName: string;          // e.g. "#1001"
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  statusLabel: string;
  financialStatus: string;
  paymentTerms?: string;      // "NET_30", "NET_60", etc.
}

// ─── Shopping List (backed by Shopify Metaobjects) ───
export interface ShoppingList {
  id: string;                 // Shopify Metaobject GID
  name: string;
  items: number;
  lastUsed: string;
  shared: number;
  note?: string;
  owner: string;
  companyId?: string;
}

// ─── Category (mapped from Shopify Collection) ───
export interface Category {
  handle: string;             // Shopify collection handle
  name: string;
  count: number;
  desc: string;
  sub: string[];
  imageUrl?: string;
}

// ─── Cart ───
export interface CartItem {
  id: string;                 // cart line ID
  merchandiseId: string;      // Shopify variant GID
  product: Product;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  note?: string;
}

export interface Cart {
  id: string;                 // Shopify cart ID
  checkoutUrl: string;
  items: CartItem[];
  subtotal: number;
  estimatedShipping?: number;
  tax?: number;
  total: number;
}

// ─── Shopify Storefront GraphQL types ───
export interface ShopifyProduct {
  id: string;
  handle: string;
  title: string;
  vendor: string;
  descriptionHtml?: string;
  featuredImage?: { url: string; altText?: string };
  images: { edges: Array<{ node: { url: string; altText?: string } }> };
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  compareAtPriceRange?: { minVariantPrice: { amount: string; currencyCode: string } };
  collections?: { edges: Array<{ node: { handle: string; title: string } }> };
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku: string;
        price: { amount: string; currencyCode: string };
        compareAtPrice?: { amount: string; currencyCode: string };
        availableForSale: boolean;
        quantityAvailable?: number;
        selectedOptions: Array<{ name: string; value: string }>;
      };
    }>;
  };
  metafields?: Array<{ key: string; value: string; namespace: string } | null>;
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description?: string;
  image?: { url: string; altText?: string };
  products: {
    edges: Array<{ node: ShopifyProduct }>;
    pageInfo: { hasNextPage: boolean; endCursor: string };
  };
}
