import Link from "next/link";

const STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? "";

export function ForgotPasswordForm() {
  const accountUrl = `https://${STORE_DOMAIN}/account`;

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
          Forgot your password?
        </h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 28px" }}>
          Enter your email and we&apos;ll help you get back into your account.
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
          Password resets are handled through Shopify&apos;s secure account portal.
        </div>

        <a
          href={accountUrl}
          className="btn btn-lg btn-block"
          style={{ display: "flex", justifyContent: "center", textDecoration: "none" }}
          target="_blank"
          rel="noreferrer"
        >
          Open Shopify account portal →
        </a>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "center" }}>
          <Link href="/login" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "underline", textUnderlineOffset: 3 }}>
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
