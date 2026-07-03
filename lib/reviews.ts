// Product reviews, metafield-backed.
//
// Reviews live in product metafields (namespace "reviews"): `rating` (avg),
// `count`, and `items` (a JSON list). This keeps the demo dependency-free —
// no external reviews app — while rendering real content on the PDP. Seed via
// scripts/seed-product-reviews.mts.

import { adminQuery } from "@/lib/shopify/admin-client";

export interface ProductReview {
  author: string;
  rating: number;
  title?: string;
  body: string;
  date?: string;
}

export interface ProductReviews {
  rating: number;
  count: number;
  reviews: ProductReview[];
}

export async function getProductReviews(productId: string): Promise<ProductReviews> {
  const gid = productId.startsWith("gid://") ? productId : `gid://shopify/Product/${productId}`;
  const data = await adminQuery<{
    product: {
      rating?: { value: string } | null;
      count?: { value: string } | null;
      items?: { value: string } | null;
    } | null;
  }>(
    `query ProductReviews($id: ID!) {
      product(id: $id) {
        rating: metafield(namespace: "reviews", key: "rating") { value }
        count: metafield(namespace: "reviews", key: "count") { value }
        items: metafield(namespace: "reviews", key: "items") { value }
      }
    }`,
    { id: gid },
  ).catch(() => ({ product: null }));

  const p = data.product;
  let reviews: ProductReview[] = [];
  try {
    if (p?.items?.value) {
      const parsed = JSON.parse(p.items.value);
      if (Array.isArray(parsed)) reviews = parsed;
    }
  } catch {
    /* malformed metafield → no reviews */
  }

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length
    : 0;
  const rating = p?.rating?.value ? parseFloat(p.rating.value) : avg;
  const count = p?.count?.value ? parseInt(p.count.value, 10) : reviews.length;

  return { rating: Math.round(rating * 10) / 10, count, reviews };
}
