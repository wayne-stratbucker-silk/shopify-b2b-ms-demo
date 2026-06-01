"use client";

import { Icon } from "@/components/ui/icons";
import { useLocation } from "@/components/location-provider";

export function PdpContactCard() {
  const { activeContact } = useLocation();

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
