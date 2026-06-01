import { NextResponse } from "next/server";

// Returns the standard resource-center folder categories for the Makeswift
// file-search Combobox (edit-time only). These are inferred from the filename
// conventions used in inferFolder() in the /files route rather than actual
// filesystem paths (Shopify Files API has no folder concept).
export async function GET() {
  const folders = [
    "spec-sheets",
    "install-guides",
    "cad-files",
    "rebate-forms",
  ];
  return NextResponse.json({ ok: true, configured: true, folders });
}
