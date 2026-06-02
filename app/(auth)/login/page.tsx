import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { LoginForm } from "./login-form";
import "@/components/makeswift/auth-marketing-panel";

const LOGIN_MARKETING_ID = "acme-b2b-login-marketing";

export default async function LoginPage() {
  const snapshot = await client.getComponentSnapshot(LOGIN_MARKETING_ID, {
    siteVersion: getSiteVersion(),
  });

  return (
    <>
      {/* ─── LEFT PANEL (dark navy) — chrome stays in code, content via Makeswift ─── */}
      <div
        className="auth-panel-left"
        style={{
          flex: "0 0 480px",
          background: "var(--primary)",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 56px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle grid overlay */}
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
          label="Login Marketing Panel"
          type="acme/auth-marketing-panel"
        />
      </div>

      {/* ─── RIGHT PANEL (white form) — code-controlled ─── */}
      <LoginForm />
    </>
  );
}
