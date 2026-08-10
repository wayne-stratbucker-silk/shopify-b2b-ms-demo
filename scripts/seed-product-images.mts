/**
 * Seed product images for the B2B demo catalog.
 *
 * Every product currently ships with zero images, so the PLP/PDP galleries are
 * blank. This attaches ~3 category-appropriate photos to each product:
 *   - Real Creative-Commons photography from LoremFlickr, keyed off the product's
 *     `productType` (14 electrical-supply categories). The redirect is resolved
 *     client-side to a direct image URL before handing it to Shopify.
 *   - A clean labeled placeholder (placehold.co) is used whenever LoremFlickr has
 *     no photo for a keyword (its "defaultImage" miss) so nothing renders broken.
 * Images are ingested via `productCreateMedia`; Shopify copies them into its own
 * CDN. Media processing is polled and any FAILED entries are replaced with a
 * placeholder, guaranteeing every product ends with at least one READY image.
 *
 * Idempotent: products that already have media are skipped (pass --force to
 * re-image). Options: --limit N (only the first N eligible products),
 * --images N (images per product, default 3), --force.
 *
 * Run: npm run seed:images   (or: ... scripts/seed-product-images.mts --limit 1)
 */
import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

const ENDPOINT = `https://${process.env.SHOPIFY_STORE_DOMAIN!}/admin/api/2026-07/graphql.json`;
const TOKEN = await getAdminToken();

const args = process.argv.slice(2);
const getArg = (flag: string, dflt: number) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? parseInt(args[i + 1], 10) : dflt;
};
const LIMIT = getArg("--limit", Infinity);
const IMAGES_PER = getArg("--images", 3);
const FORCE = args.includes("--force");

// ── Shopify Admin GraphQL with throttle-aware retry ──────────────────────────
async function gql<T>(query: string, variables?: Record<string, unknown>, tries = 5): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": TOKEN },
      body: JSON.stringify({ query, variables }),
    });
    const json = (await res.json()) as {
      data: T;
      errors?: Array<{ message: string; extensions?: { code?: string } }>;
    };
    const throttled = json.errors?.some((e) => e.extensions?.code === "THROTTLED");
    if (throttled && attempt < tries) {
      await sleep(1000 * attempt);
      continue;
    }
    if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
    return json.data;
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Category → image keywords + placeholder color ────────────────────────────
// Keywords validated against LoremFlickr (return real, non-default photos).
type Cat = { keywords: string[]; color: string };
const CATEGORIES: Record<string, Cat> = {
  "Wire & Cable": { keywords: ["electrical,wire", "copper,wire", "cable,spool"], color: "b45309" },
  "Breakers & Panels": { keywords: ["circuit,breaker", "electrical,panel", "fuse,box"], color: "1e3a5f" },
  "Lighting Fixtures": { keywords: ["light,fixture", "led,lamp", "ceiling,light"], color: "ca8a04" },
  "Switches & Receptacles": { keywords: ["light,switch", "power,outlet", "electrical,socket"], color: "0f766e" },
  "Conduit & Fittings": { keywords: ["pipe,metal", "conduit", "plumbing,pipe"], color: "4b5563" },
  "Tools & Safety": { keywords: ["hand,tool", "pliers,tool", "safety,helmet"], color: "b91c1c" },
  "Low Voltage & Communications": { keywords: ["network,cable", "ethernet", "telecom"], color: "6d28d9" },
  "Motors & Motor Controls": { keywords: ["electric,motor", "motor", "machine,industrial"], color: "155e75" },
  "Enclosures & Boxes": { keywords: ["metal,box", "junction,box", "enclosure"], color: "374151" },
  "Transformers": { keywords: ["transformer,electric", "power,transformer", "electrical,equipment"], color: "7c2d12" },
  "Cable Management": { keywords: ["cable,tray", "cable,management", "cables"], color: "3f6212" },
  "Test & Measurement": { keywords: ["multimeter", "measurement,tool", "voltmeter"], color: "1d4ed8" },
  "Industrial Controls": { keywords: ["control,panel", "industrial,control", "automation"], color: "9a3412" },
  "Grounding & Bonding": { keywords: ["copper,ground", "metal,rod", "copper,wire"], color: "78350f" },
};
const FALLBACK: Cat = { keywords: ["electrical,supply", "hardware", "industrial"], color: "334155" };

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function placeholder(label: string, color: string, slot: number): string {
  const text = encodeURIComponent(`${label}\n#${slot + 1}`);
  return `https://placehold.co/1200x1200/${color}/ffffff/jpg?text=${text}`;
}

/** Resolve a LoremFlickr keyword URL to a direct image URL; detect the "no match"
 *  default image and substitute a labeled placeholder instead. */
async function resolveImage(category: string, cat: Cat, handle: string, slot: number): Promise<{ url: string; real: boolean }> {
  const kw = cat.keywords[slot % cat.keywords.length];
  const lock = (hashCode(handle) % 90) + slot * 7 + 1;
  try {
    const res = await fetch(`https://loremflickr.com/1200/1200/${kw}?lock=${lock}`, { redirect: "follow" });
    if (res.ok && !res.url.includes("defaultImage")) return { url: res.url, real: true };
  } catch {
    /* fall through to placeholder */
  }
  return { url: placeholder(category, cat.color, slot), real: false };
}

// ── Fetch all products (id, handle, title, productType, mediaCount) ──────────
interface P { id: string; handle: string; title: string; productType: string; media: number }
async function allProducts(): Promise<P[]> {
  const out: P[] = [];
  let after: string | null = null;
  do {
    const d: {
      products: {
        edges: Array<{ node: { id: string; handle: string; title: string; productType: string; mediaCount: { count: number } } }>;
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
      };
    } = await gql(
      `query($after:String){products(first:100,after:$after,sortKey:TITLE){
        edges{node{id handle title productType mediaCount{count}}}
        pageInfo{hasNextPage endCursor}}}`,
      { after },
    );
    for (const e of d.products.edges)
      out.push({ id: e.node.id, handle: e.node.handle, title: e.node.title, productType: e.node.productType, media: e.node.mediaCount.count });
    after = d.products.pageInfo.hasNextPage ? d.products.pageInfo.endCursor : null;
  } while (after);
  return out;
}

async function attachMedia(productId: string, media: Array<{ originalSource: string; alt: string }>): Promise<string[]> {
  const d = await gql<{
    productCreateMedia: { media: Array<{ id: string }>; mediaUserErrors: Array<{ field: string[]; message: string }> };
  }>(
    `mutation($productId:ID!,$media:[CreateMediaInput!]!){
      productCreateMedia(productId:$productId,media:$media){
        media{ id }
        mediaUserErrors{ field message }
      }
    }`,
    { productId, media: media.map((m) => ({ originalSource: m.originalSource, alt: m.alt, mediaContentType: "IMAGE" })) },
  );
  const errs = d.productCreateMedia.mediaUserErrors;
  if (errs.length) console.warn(`    ⚠ mediaUserErrors: ${errs.map((e) => e.message).join("; ")}`);
  return d.productCreateMedia.media.map((m) => m.id);
}

/** Poll a product's media until none are still processing; return status counts. */
async function mediaStatus(productId: string): Promise<{ ready: number; failed: string[] }> {
  for (let i = 0; i < 8; i++) {
    const d = await gql<{
      product: { media: { nodes: Array<{ id: string; status?: string; mediaContentType: string }> } };
    }>(
      `query($id:ID!){product(id:$id){media(first:20){nodes{
        ... on MediaImage { id status } mediaContentType }}}}`,
      { id: productId },
    );
    const imgs = d.product.media.nodes.filter((n) => n.mediaContentType === "IMAGE");
    const processing = imgs.filter((n) => n.status === "PROCESSING" || n.status === "UPLOADED");
    if (processing.length === 0) {
      return { ready: imgs.filter((n) => n.status === "READY").length, failed: imgs.filter((n) => n.status === "FAILED").map((n) => n.id) };
    }
    await sleep(1500);
  }
  return { ready: 0, failed: [] };
}

async function deleteMedia(productId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await gql(
    `mutation($productId:ID!,$mediaIds:[ID!]!){productDeleteMedia(productId:$productId,mediaIds:$mediaIds){deletedMediaIds mediaUserErrors{message}}}`,
    { productId, mediaIds: ids },
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
const products = await allProducts();
const eligible = products.filter((p) => FORCE || p.media === 0).slice(0, LIMIT === Infinity ? undefined : LIMIT);
console.log(`Catalog: ${products.length} products · ${products.filter((p) => p.media === 0).length} without images · seeding ${eligible.length} (images/product=${IMAGES_PER}${FORCE ? ", FORCE" : ""})\n`);

let done = 0, realCount = 0, phCount = 0, fixedFailed = 0;
for (const p of eligible) {
  const cat = CATEGORIES[p.productType] ?? FALLBACK;
  const label = p.productType || "Electrical Supply";

  // Build sources (resolve LoremFlickr → direct url, or placeholder on miss)
  const sources: Array<{ originalSource: string; alt: string }> = [];
  for (let slot = 0; slot < IMAGES_PER; slot++) {
    const { url, real } = await resolveImage(label, cat, p.handle, slot);
    if (real) realCount++; else phCount++;
    sources.push({ originalSource: url, alt: `${p.title} — ${label} (view ${slot + 1})` });
  }

  await attachMedia(p.id, sources);
  const { ready, failed } = await mediaStatus(p.id);

  // Replace any FAILED media with a guaranteed placeholder.
  if (failed.length) {
    await deleteMedia(p.id, failed);
    await attachMedia(p.id, failed.map((_, i) => ({ originalSource: placeholder(label, cat.color, i), alt: `${p.title} — ${label}` })));
    fixedFailed += failed.length;
  }
  // If nothing came out READY at all, ensure at least one placeholder image.
  if (ready === 0 && failed.length === 0) {
    await attachMedia(p.id, [{ originalSource: placeholder(label, cat.color, 0), alt: `${p.title} — ${label}` }]);
  }

  done++;
  console.log(`  [${done}/${eligible.length}] ${p.handle.padEnd(44)} ${label.padEnd(28)} ready=${ready} failed=${failed.length}`);
  await sleep(250); // gentle on the GraphQL cost bucket
}

console.log(`\n✅ Images seeded on ${done} products. sources: ${realCount} photo, ${phCount} placeholder; failed→placeholder: ${fixedFailed}`);
