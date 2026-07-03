import { NextResponse } from "next/server";

// Resource-center "folder" categories for the Makeswift file-search picker
// (edit-time only). Shopify Files has no folder concept, so these mirror the
// filename conventions inferFolder() uses in /api/shopify/files.
export async function GET() {
  const folders = ["spec-sheets", "install-guides", "cad-files", "rebate-forms"];
  return NextResponse.json({ ok: true, configured: true, folders });
}
