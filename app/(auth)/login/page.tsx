import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="card" style={{ padding: 40 }}>
      <div style={{ textAlign: "center", marginBottom: 32 }}>
        <h1 className="text-h2" style={{ fontWeight: 700, marginBottom: 8 }}>Sign in</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>Access your B2B account</p>
      </div>

      <form action="/api/auth/login" method="GET">
        <button type="submit" className="btn btn-primary btn-lg btn-block" style={{ width: "100%", cursor: "pointer" }}>
          Continue with Shopify
        </button>
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
        <Link href="/forgot-password" className="text-xs" style={{ color: "var(--muted)", textDecoration: "underline" }}>
          Forgot password?
        </Link>
        <Link href="/register" className="text-xs" style={{ color: "var(--muted)", textDecoration: "underline" }}>
          Create account
        </Link>
      </div>

      <p className="text-xs" style={{ color: "var(--muted-2)", textAlign: "center", marginTop: 20 }}>
        By signing in you agree to our terms of service.
      </p>
    </div>
  );
}
