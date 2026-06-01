import { adminQuery } from "@/lib/shopify/admin-client";
import { NextResponse } from "next/server";

interface InventoryByVariantResult {
  productVariant: {
    inventoryItem: {
      inventoryLevels: {
        edges: Array<{
          node: {
            location: { id: string; name: string };
            quantities: Array<{ quantity: number }>;
          };
        }>;
      };
    };
  } | null;
}

interface InventoryByProductResult {
  product: {
    variants: {
      edges: Array<{
        node: {
          inventoryItem: {
            inventoryLevels: {
              edges: Array<{
                node: {
                  location: { id: string; name: string };
                  quantities: Array<{ quantity: number }>;
                };
              }>;
            };
          };
        };
      }>;
    };
  } | null;
}

function parseGid(gid: string): number {
  const parts = gid.split("/");
  return parseInt(parts[parts.length - 1], 10) || 0;
}

function levelsToWarehouses(
  edges: Array<{
    node: {
      location: { id: string; name: string };
      quantities: Array<{ quantity: number }>;
    };
  }>,
) {
  return edges.map((e) => ({
    name: e.node.location.name,
    qty: e.node.quantities[0]?.quantity ?? 0,
    locationId: parseGid(e.node.location.id),
  }));
}

const LEVELS_FRAGMENT = `
  inventoryLevels(first: 20) {
    edges {
      node {
        location { id name }
        quantities(names: ["available"]) { quantity }
      }
    }
  }
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variantId = searchParams.get("variantId");
  const productId = searchParams.get("productId");

  try {
    if (variantId) {
      const data = await adminQuery<InventoryByVariantResult>(
        `query GetInventoryByVariant($id: ID!) {
          productVariant(id: $id) {
            inventoryItem { ${LEVELS_FRAGMENT} }
          }
        }`,
        { id: variantId },
      );
      const edges =
        data.productVariant?.inventoryItem?.inventoryLevels.edges ?? [];
      return NextResponse.json({ warehouses: levelsToWarehouses(edges) });
    }

    if (productId) {
      const data = await adminQuery<InventoryByProductResult>(
        `query GetInventoryByProduct($id: ID!) {
          product(id: $id) {
            variants(first: 1) {
              edges {
                node {
                  inventoryItem { ${LEVELS_FRAGMENT} }
                }
              }
            }
          }
        }`,
        { id: productId },
      );
      const edges =
        data.product?.variants.edges[0]?.node?.inventoryItem?.inventoryLevels
          .edges ?? [];
      return NextResponse.json({ warehouses: levelsToWarehouses(edges) });
    }

    return NextResponse.json({ warehouses: [] });
  } catch {
    return NextResponse.json({ warehouses: [] }, { status: 500 });
  }
}
