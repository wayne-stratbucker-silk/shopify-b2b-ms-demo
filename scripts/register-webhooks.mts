/**
 * Register Shopify Webhooks
 *
 * Registers required webhooks pointing to the deployed app URL.
 * Run: npm run register-webhooks
 */

import "dotenv/config";
import { getAdminToken } from "../lib/shopify/admin-token";

const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const ADMIN_TOKEN = await getAdminToken();
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const API_VERSION = "2026-07";

const TOPICS = [
  "products/create",
  "products/update",
  "products/delete",
  "inventory_levels/update",
  "orders/create",
  "orders/updated",
  "draft_orders/create",
  "draft_orders/update",
  "collections/update",
];

async function registerWebhook(topic: string): Promise<void> {
  const res = await fetch(
    `https://${STORE_DOMAIN}/admin/api/${API_VERSION}/webhooks.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": ADMIN_TOKEN,
      },
      body: JSON.stringify({
        webhook: {
          topic,
          address: `${APP_URL}/api/shopify/webhooks`,
          format: "json",
        },
      }),
    }
  );

  const json = await res.json() as { webhook?: { id: number }; errors?: unknown };
  if (json.webhook?.id) {
    console.log(`  ✓ Registered: ${topic} → ${APP_URL}/api/shopify/webhooks`);
  } else {
    console.warn(`  ⚠ ${topic}:`, JSON.stringify(json.errors));
  }
}

async function main() {
  if (!ADMIN_TOKEN || !APP_URL) {
    console.error("❌ Missing SHOPIFY_ADMIN_API_TOKEN or NEXT_PUBLIC_APP_URL");
    process.exit(1);
  }

  console.log(`🔗 Registering webhooks for ${STORE_DOMAIN}`);
  console.log(`   Target: ${APP_URL}/api/shopify/webhooks\n`);

  for (const topic of TOPICS) {
    await registerWebhook(topic);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log("\n✅ Webhook registration complete");
}

main().catch(err => { console.error("❌ Failed:", err); process.exit(1); });
