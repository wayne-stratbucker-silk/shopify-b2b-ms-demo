import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession, ACTIVE_LOCATION_COOKIE_NAME, ACTIVE_LOCATION_COOKIE_OPTS } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export const dynamic = "force-dynamic";

interface CompanyLocation {
  id: string;
  name: string;
}

async function fetchLocations(companyId: string): Promise<CompanyLocation[]> {
  const data = await adminQuery<{
    company: { locations: { edges: Array<{ node: CompanyLocation }> } } | null;
  }>(
    `query GetLocations($id: ID!) {
      company(id: $id) {
        locations(first: 20) {
          edges { node { id name } }
        }
      }
    }`,
    { id: companyId }
  ).catch(() => ({ company: null }));
  return data.company?.locations?.edges?.map(e => e.node) ?? [];
}

async function switchLocation(formData: FormData) {
  "use server";
  const locationId = formData.get("locationId") as string;
  if (!locationId) return;
  const session = await getSession();
  if (!session?.companyId) return;

  // Verify the location actually belongs to this company before setting it
  const locations = await fetchLocations(session.companyId);
  const valid = locations.some(l => l.id === locationId);
  if (!valid) return;

  const jar = await cookies();
  jar.set(ACTIVE_LOCATION_COOKIE_NAME, locationId, ACTIVE_LOCATION_COOKIE_OPTS);
  redirect("/account/settings");
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/settings");

  const locations = session.companyId ? await fetchLocations(session.companyId) : [];
  const activeLocationId = session.companyLocationId ?? "";

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Account Settings</h1>

      {/* Profile */}
      <div className="card" style={{ padding: 24, marginBottom: 16 }}>
        <h2 className="text-h3" style={{ fontWeight: 600, marginBottom: 16 }}>Profile</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Name</div>
            <div className="text-body">{session.name}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Email</div>
            <div className="text-body">{session.email}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Role</div>
            <div className="text-body" style={{ textTransform: "capitalize" }}>{session.role}</div>
          </div>
          {session.companyName && (
            <div>
              <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Company</div>
              <div className="text-body">{session.companyName}</div>
            </div>
          )}
        </div>
        <p className="text-xs" style={{ color: "var(--muted)", marginTop: 16 }}>
          To update your name, email, or password,{" "}
          <a
            href={`https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/account`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)" }}
          >
            manage your account on Shopify →
          </a>
        </p>
      </div>

      {/* Active location */}
      {locations.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h2 className="text-h3" style={{ fontWeight: 600, marginBottom: 4 }}>Active Location</h2>
          <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 16 }}>
            Orders, quotes, and carts are placed against your active location.
          </p>
          {locations.length === 1 ? (
            <div className="text-body">{locations[0].name}</div>
          ) : (
            <form action={switchLocation}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <select
                  name="locationId"
                  defaultValue={activeLocationId}
                  className="select"
                  style={{ flex: 1 }}
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                <button type="submit" className="btn btn-primary">Switch</button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
