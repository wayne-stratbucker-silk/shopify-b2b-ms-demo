"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";

export interface CompanyFileItem {
  id: string;
  title: string;
  category: string;
  recordType: string;
  recordId: string;
  mimeType: string;
  size?: number;
  updatedAt: string;
  downloadHref: string;
}

function formatBadge(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("pdf")) return "PDF";
  if (m.includes("sheet") || m.includes("excel") || m.includes("csv")) return "XLS";
  if (m.includes("word") || m.includes("document")) return "DOC";
  if (m.startsWith("image/")) return "IMG";
  if (m.includes("zip")) return "ZIP";
  return "FILE";
}

function fmtSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}

export function CompanyFilesTable({ files, canUpload }: { files: CompanyFileItem[]; canUpload: boolean }) {
  const [category, setCategory] = useState<string>("All");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  const categories = useMemo(() => {
    const set = new Set<string>();
    files.forEach((f) => f.category && set.add(f.category));
    return ["All", ...Array.from(set).sort()];
  }, [files]);

  const visible = useMemo(() => {
    const list = category === "All" ? files : files.filter((f) => f.category === category);
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, [files, category]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", file.name);
      const res = await fetch("/api/b2b/company-files", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast(data.error || "Upload failed", "error"); return; }
      toast("Document uploaded", "success");
      router.refresh();
    } catch {
      toast("Upload failed", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {/* Category pills */}
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)}
                    className={`btn btn-sm ${c === category ? "btn-primary" : "btn-ghost"}`}>
              {c}
            </button>
          ))}
        </div>
        {canUpload && (
          <div>
            <input ref={fileRef} type="file" onChange={onPick} style={{ display: "none" }} />
            <button type="button" className="btn btn-primary btn-sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
              <Icon name="download" size={14} style={{ transform: "rotate(180deg)" }} />
              {uploading ? "Uploading…" : "Upload document"}
            </button>
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No documents{category !== "All" ? ` in ${category}` : ""} yet.
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead><tr><th style={{ width: 52 }} /><th>Name</th><th>Category</th><th className="num">Size</th><th>Updated</th><th style={{ width: 60 }} /></tr></thead>
            <tbody>
              {visible.map((f) => (
                <tr key={f.id}>
                  <td><span className="badge">{formatBadge(f.mimeType)}</span></td>
                  <td style={{ fontWeight: 500 }}>{f.title}</td>
                  <td className="text-sm" style={{ color: "var(--muted)" }}>{f.category || "—"}</td>
                  <td className="num text-sm">{fmtSize(f.size)}</td>
                  <td className="text-sm" style={{ color: "var(--muted)" }}>{fmtDate(f.updatedAt)}</td>
                  <td>
                    <a href={f.downloadHref} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" aria-label={`Download ${f.title}`}>
                      <Icon name="download" size={14} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
