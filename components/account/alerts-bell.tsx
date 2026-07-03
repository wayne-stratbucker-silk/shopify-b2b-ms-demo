"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icons";

interface Alert {
  id: string;
  severity: "err" | "warn" | "info";
  title: string;
  body?: string;
  href?: string;
  read?: boolean;
}

const DOT: Record<Alert["severity"], string> = {
  err: "var(--danger, #dc2626)",
  warn: "#d97706",
  info: "var(--primary)",
};

export function AccountAlertsBell() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/account/alerts")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setAlerts(d.alerts ?? []); setUnread(d.unreadCount ?? 0); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    // Opening the panel marks everything currently shown as read.
    if (next && unread > 0) {
      setUnread(0);
      fetch("/api/account/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="btn btn-ghost btn-sm"
        style={{ position: "relative" }}
      >
        <Icon name="alert" size={16} />
        {unread > 0 && (
          <span style={{ position: "absolute", top: -4, right: -4, background: "var(--danger, #dc2626)", color: "#fff", borderRadius: 999, fontSize: 10, lineHeight: 1, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", fontWeight: 700 }}>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className="card" style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 80, width: 320, maxWidth: "90vw", padding: 0, boxShadow: "0 10px 32px rgba(0,0,0,.16)", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--line)", fontWeight: 600, fontSize: 13 }}>Notifications</div>
          {alerts.length === 0 ? (
            <div style={{ padding: "28px 14px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>You&apos;re all caught up.</div>
          ) : (
            <div style={{ maxHeight: 360, overflow: "auto" }}>
              {alerts.map((a) => {
                const inner = (
                  <div style={{ display: "flex", gap: 10, padding: "11px 14px", borderBottom: "1px solid var(--line)", alignItems: "flex-start" }}>
                    <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 999, background: DOT[a.severity], marginTop: 5, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{a.title}</div>
                      {a.body && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{a.body}</div>}
                    </div>
                  </div>
                );
                return a.href ? (
                  <Link key={a.id} href={a.href} onClick={() => setOpen(false)} style={{ display: "block", textDecoration: "none", color: "var(--ink)" }}>{inner}</Link>
                ) : (
                  <div key={a.id}>{inner}</div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
