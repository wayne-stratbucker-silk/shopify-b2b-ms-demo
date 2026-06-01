import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST() {
  const jar = await cookies();
  jar.delete("acme_session");
  jar.delete("acme_active_location");
  return NextResponse.redirect(new URL("/", APP_URL));
}

export async function GET() {
  return POST();
}
