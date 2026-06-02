import Link from "next/link";

export function RegisterForm() {
  return (
    <div
      className="auth-panel-right"
      style={{
        flex: 1,
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 32px",
      }}
    >
      <div
        className="auth-card"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-card)",
          padding: "40px 36px",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 6px" }}>
          Apply for a trade account
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 28px" }}>
          Set up your B2B account through Shopify&apos;s secure portal.
        </p>

        <div
          style={{
            background: "var(--primary-fade)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: "12px 16px",
            marginBottom: 24,
            fontSize: 13,
            color: "var(--ink-2)",
            lineHeight: 1.6,
          }}
        >
          Account registration is handled securely through Shopify. Click below to open the registration page.
        </div>

        <form action="/api/auth/login" method="GET">
          <input type="hidden" name="mode" value="register" />
          <button type="submit" className="btn btn-lg btn-block">
            Create account with Shopify
          </button>
        </form>

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "center",
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <Link href="/login" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
