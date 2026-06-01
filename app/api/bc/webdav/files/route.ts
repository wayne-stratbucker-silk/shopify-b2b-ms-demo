import { NextResponse } from "next/server";
import { adminQuery } from "@/lib/shopify/admin-client";

interface ShopifyFile {
  id: string;
  alt: string | null;
  createdAt: string;
  fileStatus: string;
  preview: { image: { url: string } } | null;
}

// Shopify Files API equivalent of the old BC WebDAV file listing.
// Used by the Makeswift file-search component's Combobox at EDIT TIME only —
// never called during storefront rendering.
// Files must be tagged with "resource-center" in Shopify Admin → Content → Files
// (via the file's alt text or filename convention).
export async function GET() {
  try {
    const data = await adminQuery<{
      files: { edges: Array<{ node: ShopifyFile & { url?: string } }> };
    }>(
      `query GetFiles($query: String!) {
        files(first: 100, query: $query) {
          edges {
            node {
              id
              alt
              createdAt
              fileStatus
              ... on GenericFile {
                url
                originalFileSize
              }
              ... on MediaImage {
                preview { image { url } }
              }
            }
          }
        }
      }`,
      { query: "status:READY" },
    );

    const files = data.files.edges
      .map(({ node }) => {
        const url = (node as { url?: string }).url ?? node.preview?.image?.url ?? "";
        if (!url) return null;
        const filename = url.split("/").pop()?.split("?")[0] ?? node.id;
        const folder = inferFolder(filename);
        return { path: url, name: filename, folder };
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, configured: true, files });
  } catch {
    return NextResponse.json({ ok: true, configured: false, files: [] });
  }
}

function inferFolder(filename: string): string {
  const lc = filename.toLowerCase();
  if (lc.includes("spec") || lc.includes("cut-sheet") || lc.includes("cutsheet")) return "spec-sheets";
  if (lc.includes("install") || lc.includes("guide") || lc.includes("manual")) return "install-guides";
  if (lc.includes("cad") || lc.includes("dwg") || lc.includes("dxf")) return "cad-files";
  if (lc.includes("rebate") || lc.includes("form")) return "rebate-forms";
  return "";
}
