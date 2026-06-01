import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");
  const hmac = url.searchParams.get("hmac");

  // Verify state
  const jar = await cookies();
  const storedState = jar.get("shopify_oauth_state")?.value;
  if (!state || state !== storedState) {
    return NextResponse.json({ error: "State mismatch" }, { status: 400 });
  }
  jar.delete("shopify_oauth_state");

  // Verify HMAC
  const clientSecret = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET!;
  const params = Object.fromEntries(url.searchParams);
  delete params.hmac;
  const message = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join("&");
  const digest = createHmac("sha256", clientSecret).update(message).digest("hex");
  if (digest !== hmac) {
    return NextResponse.json({ error: "HMAC validation failed" }, { status: 400 });
  }

  // Exchange code for access token
  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenRes.json() as { access_token?: string; scope?: string; error?: string };

  if (!tokenData.access_token) {
    return NextResponse.json({ error: "Token exchange failed", detail: tokenData }, { status: 400 });
  }

  // Return token — copy this into SHOPIFY_ADMIN_API_TOKEN in .env.local
  return new NextResponse(
    `<html><body style="font-family:monospace;padding:40px;background:#f5f5f5">
      <h2>✅ Shopify OAuth Complete</h2>
      <p>Copy this token into your <code>.env.local</code> as <code>SHOPIFY_ADMIN_API_TOKEN</code>:</p>
      <textarea style="width:100%;height:80px;font-size:14px;padding:10px" onclick="this.select()">${tokenData.access_token}</textarea>
      <p style="color:#666">Scopes granted: ${tokenData.scope}</p>
      <p><strong>Do not share this token.</strong> Close this tab when done.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
