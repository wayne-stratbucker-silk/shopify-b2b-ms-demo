import Link from "next/link";
import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { RegisterForm } from "./register-form";
import "@/components/makeswift/auth-marketing-panel";

const REGISTER_MARKETING_ID = "acme-b2b-register-marketing";

export default async function RegisterPage() {
  const snapshot = await client.getComponentSnapshot(REGISTER_MARKETING_ID, {
    siteVersion: getSiteVersion(),
  });

  return (
    <>
      {/* ─── LEFT PANEL (dark navy) — chrome stays in code, content via Makeswift ─── */}
      <div
        className="auth-panel-left"
        style={{
          flex: "0 0 440px",
          background: "var(--primary)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 52px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "repeating-linear-gradient(0deg,rgba(255,255,255,.03) 0 1px,transparent 1px 48px)," +
              "repeating-linear-gradient(90deg,rgba(255,255,255,.03) 0 1px,transparent 1px 48px)",
          }}
        />

        <MakeswiftComponent
          snapshot={snapshot}
          label="Register Marketing Panel"
          type="acme/auth-marketing-panel"
        />

        {/* Sign-in link — navigation, kept in code */}
        <div style={{ position: "relative", marginTop: 36, fontSize: 12, color: "rgba(255,255,255,.4)" }}>
          Already have an account?{" "}
          <Link href="/login" style={{ color: "rgba(255,255,255,.7)", textDecoration: "underline" }}>
            Sign in
          </Link>
        </div>
      </div>

      {/* ─── RIGHT PANEL (form) — code-controlled ─── */}
      <RegisterForm />
    </>
  );
}
