import Link from "next/link";

export function LoginForm() {
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
          Sign in to your account
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 28px" }}>
          Contractor &amp; trade accounts only.{" "}
          <Link href="/register" style={{ color: "var(--info)", textDecoration: "underline" }}>
            Apply for access
          </Link>
        </p>

        <form action="/api/auth/login" method="GET" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <button type="submit" className="btn btn-lg btn-block">
            Continue with Shopify
          </button>
        </form>

        <div
          style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid var(--line)",
            display: "flex",
            justifyContent: "center",
            gap: 20,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          <Link href="/register" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            Apply for a trade account
          </Link>
          <Link href="/forgot-password" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            Forgot password?
          </Link>
        </div>
      </div>
    </div>
  );
}
