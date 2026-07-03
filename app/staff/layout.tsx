import Link from "next/link";
import { getStaffSession } from "@/lib/staff/session";
import { StaffSignOut } from "@/components/staff/sign-out-button";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaffSession();

  return (
    <div>
      <header style={{ borderBottom: "1px solid var(--line)", background: "var(--bg)" }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
          <Link href="/staff" style={{ fontWeight: 700, textDecoration: "none", color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ background: "var(--ink, #111)", color: "#fff", width: 26, height: 26, borderRadius: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontFamily: "var(--font-geist-mono, monospace)" }}>S</span>
            Staff Console
          </Link>
          {staff && (
            <div className="row" style={{ gap: 12, alignItems: "center" }}>
              <span className="muted" style={{ fontSize: 13 }}>{staff.email}</span>
              <StaffSignOut />
            </div>
          )}
        </div>
      </header>
      <div className="container section">{children}</div>
    </div>
  );
}
