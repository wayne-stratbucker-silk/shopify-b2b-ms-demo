import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export const dynamic = "force-dynamic";

interface CompanyLocation {
  id: string;
  name: string;
  shippingAddress?: {
    address1?: string;
    address2?: string;
    city?: string;
    zoneCode?: string;
    zip?: string;
    countryCode?: string;
    phone?: string;
  };
  billingSameAsShipping?: boolean;
}

async function fetchLocations(companyId: string): Promise<CompanyLocation[]> {
  const data = await adminQuery<{
    company: { locations: { edges: Array<{ node: CompanyLocation }> } } | null;
  }>(
    `query GetLocations($id: ID!) {
      company(id: $id) {
        locations(first: 20) {
          edges { node {
            id name billingSameAsShipping
            shippingAddress {
              address1 address2 city zoneCode zip countryCode phone
            }
          }}
        }
      }
    }`,
    { id: companyId }
  ).catch(() => ({ company: null }));
  return data.company?.locations?.edges?.map(e => e.node) ?? [];
}

export default async function AddressesPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/addresses");

  const locations = session.companyId ? await fetchLocations(session.companyId) : [];

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 8 }}>Company Locations</h1>
      <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 24 }}>
        Shipping addresses are managed per company location.
      </p>

      {locations.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No locations found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {locations.map(loc => {
            const addr = loc.shippingAddress;
            return (
              <div key={loc.id} className="card" style={{ padding: 20 }}>
                <div className="text-h4" style={{ fontWeight: 600, marginBottom: 8 }}>{loc.name}</div>
                {addr ? (
                  <div className="text-sm" style={{ lineHeight: 1.7, color: "var(--ink-2)" }}>
                    {addr.address1 && <div>{addr.address1}</div>}
                    {addr.address2 && <div>{addr.address2}</div>}
                    {(addr.city || addr.zoneCode || addr.zip) && (
                      <div>{[addr.city, addr.zoneCode, addr.zip].filter(Boolean).join(", ")}</div>
                    )}
                    {addr.countryCode && <div>{addr.countryCode}</div>}
                    {addr.phone && <div style={{ color: "var(--muted)", marginTop: 4 }}>{addr.phone}</div>}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: "var(--muted)" }}>No address on file</p>
                )}
                {loc.billingSameAsShipping && (
                  <div className="text-xs" style={{ color: "var(--muted-2)", marginTop: 8 }}>
                    Billing same as shipping
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
