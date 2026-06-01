import Link from "next/link";

export default function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string }> }) {
  return (
    <div className="card" style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 className="text-h2" style={{ fontWeight: 700, marginBottom: 8 }}>Sign in</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Access your B2B account</p>
      </div>

      <a
        href="/api/auth/login"
        className="btn btn-primary btn-lg btn-block"
        style={{ textAlign: "center", display: "block" }}
      >
        Continue with Shopify
      </a>

      <p className="text-xs" style={{ color: "var(--muted-2)", textAlign: "center", marginTop: 24 }}>
        By signing in you agree to our terms of service.
      </p>
    </div>
  );
}
