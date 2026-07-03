"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icons";

export interface RecordFile {
  id: string;
  title: string;
  mimeType: string;
  size?: number;
  downloadHref: string;
}

interface Props {
  files: RecordFile[];
  variant?: "button" | "icon";
  label?: string;
}

/**
 * Compact dropdown of documents attached to a record (invoice / order / quote).
 * Renders nothing when there are no attachments.
 */
export function RecordFilesMenu({ files, variant = "button", label = "Documents" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (files.length === 0) return null;

  function downloadAll() {
    files.forEach((f, i) => {
      // Stagger so the browser doesn't drop rapid navigations.
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = f.downloadHref;
        a.target = "_blank";
        a.rel = "noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }, i * 250);
    });
  }

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        className={variant === "icon" ? "btn btn-ghost btn-sm" : "btn btn-ghost btn-sm"}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Icon name="doc" size={14} />
        {variant === "button" && <span>{label} ({files.length})</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="card"
          style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 60, minWidth: 240, padding: 6, boxShadow: "0 8px 28px rgba(0,0,0,.14)" }}
        >
          {files.map((f) => (
            <a
              key={f.id}
              href={f.downloadHref}
              target="_blank"
              rel="noreferrer"
              role="menuitem"
              className="row"
              style={{ gap: 8, padding: "8px 10px", borderRadius: "var(--radius)", textDecoration: "none", color: "var(--ink)", fontSize: 13, alignItems: "center" }}
            >
              <Icon name="download" size={13} />
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.title}</span>
            </a>
          ))}
          {files.length > 1 && (
            <>
              <div style={{ borderTop: "1px solid var(--line)", margin: "4px 0" }} />
              <button type="button" role="menuitem" onClick={downloadAll}
                      className="row" style={{ gap: 8, padding: "8px 10px", width: "100%", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--primary)", fontWeight: 600 }}>
                <Icon name="download" size={13} /> Download all
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
