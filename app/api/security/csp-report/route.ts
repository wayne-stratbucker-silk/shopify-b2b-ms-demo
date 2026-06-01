import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.warn("[CSP]", JSON.stringify(body));
  } catch {
    // ignore malformed reports
  }
  return new NextResponse(null, { status: 204 });
}
