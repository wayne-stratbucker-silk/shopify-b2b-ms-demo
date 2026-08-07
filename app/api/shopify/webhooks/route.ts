import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { revalidateTag } from "next/cache";

const WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET ?? "";

async function verifyHmac(body: string, hmacHeader: string): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false;
  const expected = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("base64");
  if (expected.length !== hmacHeader.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(hmacHeader));
}

export async function POST(req: Request) {
  const body = await req.text();
  const hmac = req.headers.get("X-Shopify-Hmac-Sha256") ?? "";
  const topic = req.headers.get("X-Shopify-Topic") ?? "";

  if (!await verifyHmac(body, hmac)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  switch (topic) {
    case "products/create":
    case "products/update": {
      const handle = payload.handle as string;
      if (handle) {
        revalidateTag(`product:${handle}`);
        revalidateTag("products:featured");
      }
      console.log(`[webhook] ${topic} handle=${handle}`);
      break;
    }
    case "products/delete":
      revalidateTag("products:featured");
      break;
    case "collections/update": {
      const collHandle = payload.handle as string;
      if (collHandle) revalidateTag(`collection:${collHandle}`);
      break;
    }
    case "orders/create":
    case "orders/updated":
      // No ISR needed — account portal fetches orders live
      break;
    case "draft_orders/update":
      // Quote status changes — no ISR needed
      break;
    default:
      break;
  }

  return new NextResponse(null, { status: 200 });
}
