import Link from "next/link";

const STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ?? "";

export default function ForgotPasswordPage() {
  const accountUrl = `https://${STORE_DOMAIN}/account`;

  return (
    <div className="card" style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 className="text-h2" style={{ fontWeight: 700, marginBottom: 8 }}>Reset password</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          We&apos;ll help you get back into your account
        </p>
      </div>

      <div style={{ background: "var(--surface)", borderRadius: "var(--radius)", padding: 16, marginBottom: 24, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
        Password resets are handled through Shopify&apos;s secure account portal. Click below to access your account and request a password reset.
      </div>

      <a
        href={accountUrl}
        className="btn btn-primary btn-lg btn-block"
        style={{ textAlign: "center", display: "block", cursor: "pointer" }}
        target="_blank"
        rel="noreferrer"
      >
        Go to Shopify account portal →
      </a>

      <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "var(--muted)" }}>
        Remembered your password?{" "}
        <Link href="/login" style={{ color: "var(--primary)", textDecoration: "underline" }}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
