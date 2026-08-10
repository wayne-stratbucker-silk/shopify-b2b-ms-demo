import Link from "next/link";
import { getStaffSession } from "@/lib/staff/session";
import { googleConfigured } from "@/lib/staff/google";
import { listCompanies, type StaffCompany } from "@/lib/staff/companies";
import { resolveRep, listRepCompanies } from "@/lib/staff/rep";
import { MasqueradeModal } from "@/components/staff/masquerade-modal";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; error?: string; all?: string }> };

export default async function StaffPage({ searchParams }: Props) {
  const { q, error, all } = await searchParams;
  const staff = await getStaffSession();

  if (!staff) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "40px auto", padding: 40, textAlign: "center" }}>
        <h1 className="text-h1" style={{ marginBottom: 8 }}>Staff sign in</h1>
        <p className="muted" style={{ marginBottom: 24, fontSize: 13 }}>Use your authorized work Google account.</p>
        {error === "denied" && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>That account isn&apos;t authorized for staff access.</p>}
        {error === "oauth" && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16 }}>Sign-in failed — please try again.</p>}
        {googleConfigured() ? (
          // Full-page navigation to the OAuth start route (which 302s to Google) —
          // not a client route, so a plain anchor is correct here.
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a href="/api/staff/auth/google/start" className="btn btn-primary btn-block">Sign in with Google</a>
        ) : (
          <p className="muted" style={{ fontSize: 13 }}>Google OAuth isn&apos;t configured on this environment.</p>
        )}
      </div>
    );
  }

  const rep = await resolveRep(staff.email);
  const isAdmin = rep?.accessLevel === "admin";
  // Admins can opt into the full company set with ?all=1; everyone else is
  // always scoped to their assigned companies.
  const showAll = isAdmin && all === "1";

  // Company source is scoped to the rep by default. Admins viewing "All accounts"
  // get the unscoped list (which also supports the search box).
  const companies: StaffCompany[] = showAll
    ? await listCompanies(q)
    : rep
      ? await listRepCompanies(rep)
      : [];

  // Empty state: no resolvable rep, or a rep with no assigned accounts. Admins in
  // "All accounts" view never hit this (they see every company / "no results").
  if (!showAll && (!rep || companies.length === 0)) {
    return (
      <div>
        <div className="page-h"><h1>My accounts</h1></div>
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No accounts assigned — contact your administrator.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-h" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h1>{showAll ? "All accounts" : "My accounts"}</h1>
        {isAdmin && (
          <div className="row" style={{ gap: 6, fontSize: 13 }}>
            <Link
              href="/staff"
              className={showAll ? "btn btn-ghost btn-xs" : "btn btn-xs"}
              aria-current={showAll ? undefined : "page"}
            >
              My accounts
            </Link>
            <Link
              href="/staff?all=1"
              className={showAll ? "btn btn-xs" : "btn btn-ghost btn-xs"}
              aria-current={showAll ? "page" : undefined}
            >
              All accounts
            </Link>
          </div>
        )}
      </div>

      {showAll && (
        <form style={{ marginBottom: 20 }}>
          <input type="hidden" name="all" value="1" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search companies…"
            style={{ width: "100%", maxWidth: 360, height: 38, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 12px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
          />
        </form>
      )}

      {companies.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>No companies found.</div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead><tr><th>Company</th><th>Account #</th><th className="num">Locations</th><th className="num">Orders</th><th style={{ width: 120 }} /></tr></thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="text-mono text-sm" style={{ color: "var(--muted)" }}>{c.externalId || "—"}</td>
                  <td className="num">{c.locations}</td>
                  <td className="num">{c.orders}</td>
                  <td><MasqueradeModal companyId={c.id} companyName={c.name} disabled={!c.contactCustomerId} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
