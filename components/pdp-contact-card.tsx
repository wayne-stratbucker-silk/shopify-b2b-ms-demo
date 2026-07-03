"use client";

import { Icon } from "@/components/ui/icons";
import { useLocation } from "@/components/location-provider";
import type { SalesRep } from "@/lib/b2b/sales-rep";

export function PdpContactCard({ salesRep }: { salesRep?: SalesRep | null }) {
  const { activeContact } = useLocation();

  // Signed-in B2B buyer with an assigned rep → show the named rep.
  if (salesRep) {
    return (
      <div className="card">
        <div className="card-h"><h3>Your account rep</h3></div>
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div className="av" style={{ width: 40, height: 40, fontSize: 15, flexShrink: 0 }}>{salesRep.initials}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{salesRep.name}</div>
              {salesRep.title && <div className="muted" style={{ fontSize: 12 }}>{salesRep.title}</div>}
            </div>
          </div>
          {salesRep.phone && (
            <a href={`tel:${salesRep.phone.replace(/\s/g, "")}`} className="btn btn-ghost btn-sm btn-block" style={{ textDecoration: "none" }}>
              <Icon name="headset" size={13} /> Call {salesRep.name.split(" ")[0]}
            </a>
          )}
          {salesRep.email && (
            <a href={`mailto:${salesRep.email}`} className="btn btn-ghost btn-sm btn-block" style={{ textDecoration: "none" }}>
              <Icon name="quote" size={13} /> Email your rep
            </a>
          )}
        </div>
      </div>
    );
  }

  // Fallback: generic support contact.
  return (
    <div className="card">
      <div className="card-h"><h3>Need help?</h3></div>
      <div className="card-b" style={{ fontSize: 13, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0 }}>Questions about specs, availability, or pricing?</p>
        <a
          href={`tel:${activeContact.phone.replace(/\s/g, "")}`}
          className="btn btn-ghost btn-sm btn-block"
          style={{ textDecoration: "none" }}
        >
          <Icon name="headset" size={13} />
          Chat with our team
        </a>
        <a
          href={`mailto:${activeContact.email}`}
          className="btn btn-ghost btn-sm btn-block"
          style={{ textDecoration: "none" }}
        >
          <Icon name="quote" size={13} />
          Email our team
        </a>
      </div>
    </div>
  );
}
