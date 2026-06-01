// "Finished SKU" policy for merchandiser-selected products.
//
// A *finished* SKU is one a shopper can actually buy as-is: either a variant
// SKU, or the SKU of a product that has no variants. A product's PARENT SKU,
// when that product has real (option-bearing) variants, is NOT finished — the
// shopper must pick a variant first, so the admin must enter a specific variant
// SKU instead.
//
// The /api/bc/products lookup already encodes this: a parent SKU that resolves
// to a variant product comes back with a populated `variants` array, whereas a
// variant SKU (or a no-variant product) comes back with `variants` undefined.
// So the test is simply "does this resolved product carry variants?".

export interface SkuProductLike {
  sku: string;
  variants?: Array<{ sku: string; label?: string }>;
}

/** True when the resolved product is directly purchasable (no variant choice needed). */
export function isFinishedSku(product: SkuProductLike): boolean {
  return !(product.variants && product.variants.length > 0);
}

/** Variant SKUs an admin could use instead of an unfinished parent SKU. */
export function variantSkusFor(product: SkuProductLike): string[] {
  return (product.variants ?? []).map((v) => v.sku).filter(Boolean);
}

/** Split resolved products into finished (renderable) and unfinished (parent-of-variants). */
export function partitionFinished<T extends SkuProductLike>(products: T[]): {
  finished: T[];
  unfinished: T[];
} {
  const finished: T[] = [];
  const unfinished: T[] = [];
  for (const p of products) (isFinishedSku(p) ? finished : unfinished).push(p);
  return { finished, unfinished };
}
