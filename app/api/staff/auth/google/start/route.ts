import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { googleAuthUrl, googleConfigured } from "@/lib/staff/google";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!googleConfigured()) {
    return NextResponse.json({ error: "Staff Google OAuth is not configured." }, { status: 503 });
  }
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/staff/auth/google/callback`;
  const state = randomBytes(16).toString("hex");

  const jar = await cookies();
  jar.set("staff_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300,
    path: "/",
  });

  return NextResponse.redirect(googleAuthUrl(state, redirectUri));
}
