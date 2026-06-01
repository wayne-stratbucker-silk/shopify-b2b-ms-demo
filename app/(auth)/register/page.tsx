import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="card" style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 className="text-h2" style={{ fontWeight: 700, marginBottom: 8 }}>Create account</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Set up your B2B account to get started
        </p>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 16, marginBottom: 24, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
        Account creation is handled securely through Shopify. Click below to open the account registration page.
      </div>

      {/* Shopify Customer Accounts — the hosted login page includes a "Create account" option */}
      <form action="/api/auth/login" method="GET">
        <input type="hidden" name="mode" value="register" />
        <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ width: "100%", cursor: "pointer" }}>
          Create account with Shopify
        </button>
      </form>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--muted)" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "var(--primary)", textDecoration: "underline" }}>
          Sign in
        </Link>
      </p>

      <p className="text-xs" style={{ color: "var(--muted-2)", textAlign: "center", marginTop: 12 }}>
        By creating an account you agree to our terms of service.
      </p>
    </div>
  );
}
