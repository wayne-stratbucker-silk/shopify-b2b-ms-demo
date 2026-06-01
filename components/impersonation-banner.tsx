"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ImpersonationBannerProps {
  name: string;
  email: string;
  company?: string;
}

export function ImpersonationBanner({ name, email, company }: ImpersonationBannerProps) {
  const router = useRouter();
  const [ending, setEnding] = useState(false);

  async function handleEnd() {
    setEnding(true);
    await fetch("/api/auth/impersonate/end", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div style={{
      background: "#7c3aed",
      color: "#fff",
      padding: "8px 0",
      fontSize: 12,
      fontWeight: 500,
      position: "sticky",
      top: 0,
      zIndex: 600,
    }}>
      <div className="container">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{
              background: "rgba(255,255,255,.2)",
              borderRadius: 4,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: ".05em",
              textTransform: "uppercase",
            }}>
              Admin View
            </span>
            <span>
              Viewing as <strong>{name}</strong>
              {company && <> · {company}</>}
              <span style={{ opacity: 0.75, marginLeft: 6 }}>{email}</span>
            </span>
          </div>
          <button
            onClick={handleEnd}
            disabled={ending}
            style={{
              background: "rgba(255,255,255,.15)",
              border: "1px solid rgba(255,255,255,.3)",
              color: "#fff",
              borderRadius: 4,
              padding: "4px 12px",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            {ending ? "Ending…" : "End impersonation"}
          </button>
        </div>
      </div>
    </div>
  );
}
