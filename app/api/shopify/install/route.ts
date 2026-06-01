import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

const SCOPES = [
  "read_products", "write_products",
  "read_draft_orders", "write_draft_orders",
  "read_orders", "write_orders",
  "read_customers", "write_customers",
  "read_companies", "write_companies",
  "read_markets", "write_markets",
  "read_price_rules", "write_price_rules",
  "read_publications", "write_publications",
  "read_metaobjects", "write_metaobjects",
  "read_metaobject_definitions", "write_metaobject_definitions",
  "read_files", "write_files",
  "read_inventory", "write_inventory",
].join(",");

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = url.searchParams.get("shop") ?? "makeswift-b2b-demo.myshopify.com";
  const clientId = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/shopify/callback`;

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("shopify_oauth_state", state, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 300 });

  const authUrl = `https://${shop}/admin/oauth/authorize?` + new URLSearchParams({
    client_id: clientId,
    scope: SCOPES,
    redirect_uri: redirectUri,
    state,
  });

  return NextResponse.redirect(authUrl);
}
