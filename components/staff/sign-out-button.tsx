"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StaffSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/staff/auth/logout", { method: "POST" }).catch(() => {});
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
