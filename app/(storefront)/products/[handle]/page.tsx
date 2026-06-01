import { notFound } from "next/navigation";
import { getProduct } from "@/lib/shopify/queries/products";
import { mapProduct } from "@/lib/shopify/product-fetcher";
import { PDPPage, type PDPResult } from "@/components/pdp-page";
import { getSession } from "@/lib/auth/session";
import type { BuyerContext } from "@/lib/shopify/storefront-client";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle).catch(() => null);
  if (!product) return { title: "Product not found" };
  return {
    title: product.title,
    description: product.descriptionHtml?.replace(/<[^>]+>/g, "").slice(0, 160),
    openGraph: { images: product.featuredImage ? [{ url: product.featuredImage.url }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const session = await getSession().catch(() => null);
  const buyer: BuyerContext | undefined = session?.companyLocationId
    ? { companyLocationId: session.companyLocationId }
    : undefined;

  const shopifyProduct = await getProduct(handle, buyer);
  if (!shopifyProduct) return notFound();

  const product = mapProduct(shopifyProduct);
  const numericId = parseInt(shopifyProduct.id.split("/").pop() ?? "0", 10);
  const result: PDPResult = {
    product,
    variants: [],
    optionConfig: undefined,
    rawId: numericId,
    relatedProductIds: [],
  };
  return <PDPPage result={result} />;
}
