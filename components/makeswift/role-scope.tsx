"use client";

import { useEffect, useState, type ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, Select, Slot } from "@makeswift/runtime/controls";

type Audience = "all" | "auth" | "guest" | "admin";

interface Session {
  role?: "admin" | "buyer";
}

interface Props {
  className?: string;
  audience?: Audience;
  children?: ReactNode;
}

/**
 * Personalization wrapper: shows the authored Slot only to a chosen audience
 * (everyone / signed-in / guests / admins). Ports catalyst's role-scope so
 * builders can gate blocks by the buyer's B2B role. Resolves the viewer from
 * /api/auth/me; renders nothing while resolving (except for "all") to avoid a
 * flash of gated content.
 */
function RoleScope({ className, audience = "all", children }: Props) {
  const [state, setState] = useState<{ session: Session | null } | null>(audience === "all" ? { session: null } : null);

  useEffect(() => {
    if (audience === "all") return;
    let live = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => { if (live) setState({ session: (d?.user as Session) ?? null }); })
      .catch(() => { if (live) setState({ session: null }); });
    return () => { live = false; };
  }, [audience]);

  if (audience === "all") return <>{children}</>;
  if (state === null) return null; // resolving

  const isAuth = !!state.session;
  const role = state.session?.role;
  const show =
    audience === "auth" ? isAuth :
    audience === "guest" ? !isAuth :
    audience === "admin" ? role === "admin" :
    false;

  if (!show) return null;
  return <div className={className}>{children}</div>;
}

runtime.registerComponent(RoleScope, {
  type: "acme-role-scope",
  label: "Personalization / Audience Scope",
  props: {
    className: Style(),
    audience: Select({
      label: "Show to",
      options: [
        { label: "Everyone", value: "all" },
        { label: "Signed-in buyers", value: "auth" },
        { label: "Guests only", value: "guest" },
        { label: "Company admins only", value: "admin" },
      ],
      defaultValue: "all",
    }),
    children: Slot(),
  },
});

export default RoleScope;
