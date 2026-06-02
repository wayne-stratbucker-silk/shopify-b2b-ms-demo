import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";
import { AddressesClient } from "./addresses-client";

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
      <div className="page-h">
        <div>
          <h1>Company locations</h1>
          <p className="sub">Shipping addresses are managed per company location.</p>
        </div>
      </div>

      {locations.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No locations found.
        </div>
      ) : (
        <div className="g3 addr-grid">
          {locations.map(loc => {
            const addr = loc.shippingAddress;
            return (
              <div key={loc.id} className="card">
                <div className="card-h">
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{loc.name}</span>
                  {loc.billingSameAsShipping && (
                    <span className="status status-info" style={{ fontSize: 11 }}>Billing = Shipping</span>
                  )}
                </div>
                <div className="card-b">
                  {addr ? (
                    <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--ink-2)" }}>
                      {addr.address1 && <div>{addr.address1}</div>}
                      {addr.address2 && <div>{addr.address2}</div>}
                      {(addr.city || addr.zoneCode || addr.zip) && (
                        <div>{[addr.city, addr.zoneCode, addr.zip].filter(Boolean).join(", ")}</div>
                      )}
                      {addr.countryCode && <div>{addr.countryCode}</div>}
                      {addr.phone && (
                        <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{addr.phone}</div>
                      )}
                    </div>
                  ) : (
                    <p className="muted" style={{ fontSize: 13 }}>No address on file</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddressesClient />
    </div>
  );
}
