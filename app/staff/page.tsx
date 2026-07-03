import { getStaffSession } from "@/lib/staff/session";
import { googleConfigured } from "@/lib/staff/google";
import { listCompanies } from "@/lib/staff/companies";
import { MasqueradeButton } from "@/components/staff/masquerade-button";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ q?: string; error?: string }> };

export default async function StaffPage({ searchParams }: Props) {
  const { q, error } = await searchParams;
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

  const companies = await listCompanies(q);

  return (
    <div>
      <div className="page-h"><h1>Companies</h1></div>

      <form style={{ marginBottom: 20 }}>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search companies…"
          style={{ width: "100%", maxWidth: 360, height: 38, border: "1px solid var(--line-2)", borderRadius: "var(--radius)", padding: "0 12px", fontSize: 13, background: "var(--bg)", color: "var(--ink)", boxSizing: "border-box" }}
        />
      </form>

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
                  <td><MasqueradeButton companyId={c.id} disabled={!c.contactCustomerId} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
