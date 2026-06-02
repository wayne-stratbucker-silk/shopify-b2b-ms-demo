"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SessionRefresher({ needsRefresh }: { needsRefresh: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!needsRefresh) return;
    fetch("/api/auth/refresh-session", { method: "POST" })
      .then((r) => {
        if (r.ok) router.refresh();
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
