import { MakeswiftComponent } from "@makeswift/runtime/next";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { client } from "@/lib/makeswift/client";
import { ForgotPasswordForm } from "./forgot-password-form";
import "@/components/makeswift/auth-marketing-panel";

const FORGOT_MARKETING_ID = "acme-b2b-forgot-marketing";

export default async function ForgotPasswordPage() {
  const snapshot = await client.getComponentSnapshot(FORGOT_MARKETING_ID, {
    siteVersion: getSiteVersion(),
  });

  return (
    <>
      {/* Left panel — chrome stays in code, content via Makeswift */}
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
          label="Forgot Password Marketing Panel"
          type="acme/auth-marketing-panel"
        />
      </div>

      {/* Right panel — form, code-controlled */}
      <ForgotPasswordForm />
    </>
  );
}
