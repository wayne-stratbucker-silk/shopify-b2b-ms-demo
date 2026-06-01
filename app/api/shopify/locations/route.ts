import { adminQuery } from "@/lib/shopify/admin-client";
import { NextResponse } from "next/server";

export const revalidate = 300;

interface LocationQueryResult {
  locations: {
    edges: Array<{
      node: {
        id: string;
        name: string;
        isActive: boolean;
        address: {
          phone?: string | null;
        };
      };
    }>;
  };
}

function parseGid(gid: string): number {
  const parts = gid.split("/");
  return parseInt(parts[parts.length - 1], 10) || 0;
}

export async function GET() {
  try {
    const data = await adminQuery<LocationQueryResult>(
      `query GetLocations {
        locations(first: 50) {
          edges {
            node {
              id
              name
              isActive
              address { phone }
            }
          }
        }
      }`,
    );

    const locations = data.locations.edges
      .filter((e) => e.node.isActive)
      .map((e) => ({
        id: parseGid(e.node.id),
        label: e.node.name,
        address: {
          phone: e.node.address?.phone ?? undefined,
          email: undefined,
        },
      }));

    return NextResponse.json({ locations });
  } catch {
    return NextResponse.json({ locations: [] }, { status: 500 });
  }
}
