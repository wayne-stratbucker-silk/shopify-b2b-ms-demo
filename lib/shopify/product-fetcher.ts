import type { Product, ShopifyProduct } from "@/types";

export function mapProduct(shopifyProduct: ShopifyProduct, customerSku?: string): Product {
  const defaultVariant = shopifyProduct.variants.edges[0]?.node;
  const price = parseFloat(defaultVariant?.price?.amount ?? "0");
  const compareAtPrice = parseFloat(defaultVariant?.compareAtPrice?.amount ?? "0");

  const metafields = (shopifyProduct.metafields ?? []).filter(Boolean) as Array<{ namespace: string; key: string; value: string }>;
  const getMeta = (key: string) => metafields.find((m) => m.key === key)?.value ?? "";

  const images = shopifyProduct.images.edges.map((e) => e.node.url);

  // quantityRules is a Shopify Plus B2B feature not available via Storefront API on all plans
  const tiers: Array<{ minQty: number; unitPrice: number }> = [];

  const inStock = shopifyProduct.variants.edges.some((e) => e.node.availableForSale);
  const totalQty = shopifyProduct.variants.edges.reduce(
    (sum, e) => sum + (e.node.quantityAvailable ?? 0),
    0,
  );

  return {
    id: shopifyProduct.id,
    variantId: defaultVariant?.id,
    handle: shopifyProduct.handle,
    sku: defaultVariant?.sku ?? shopifyProduct.handle,
    customerSku,
    name: shopifyProduct.title,
    brand: shopifyProduct.vendor ?? "",
    category: "",
    description: shopifyProduct.descriptionHtml,
    price,
    listPrice: compareAtPrice > 0 ? compareAtPrice : price,
    wasSalePrice: compareAtPrice > 0 ? compareAtPrice : undefined,
    uom: getMeta("uom") || "EA",
    stockQty: totalQty,
    leadTime: inStock ? "In stock" : "Contact for availability",
    leadTimeDays: inStock ? 1 : undefined,
    badges: [],
    tiers,
    images,
    galleryImages: images.map((url, i) => ({
      url,
      alt: shopifyProduct.featuredImage?.altText ?? shopifyProduct.title,
      sortOrder: i,
    })),
    specSheetUrl: getMeta("spec_sheet_url") || undefined,
    installGuideUrl: getMeta("install_guide_url") || undefined,
    cadFileUrl: getMeta("cad_file_url") || undefined,
    trackInventory: true,
  };
}
