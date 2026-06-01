"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import {
  Style,
  TextInput,
  TextArea,
  RichText,
  Checkbox,
  Group,
  List,
  Shape,
  Select,
  Combobox,
} from "@makeswift/runtime/controls";
import { Icon } from "@/components/ui/icons";
import { bcContentUrl } from "@/lib/bigcommerce/content-url";

// ─────────────────────────────────────────────────────────────────────────────
// File Search — the merchandiser-configurable "Resource Center" hero, category
// tiles, and document library. The library is FULLY ADMIN-CURATED — there is no
// runtime auto-listing. Admins build the list in the Makeswift panel:
//
//   1. "WebDAV folder" picker — a dropdown of the subfolders under BC
//      `/content/file-search/` (from /api/bc/webdav/folders). Sets the default
//      category for files that don't carry their own folder.
//   2. "Files" list — each row's "File" control is a searchable dropdown of the
//      files in BC WebDAV (/api/bc/webdav/files), so admins pick files instead
//      of typing names/URLs. An optional URL field stays for external links or
//      files not yet uploaded.
//
// Both dropdowns hit the WebDAV routes at EDIT TIME only (Makeswift Combobox
// getOptions), never at render — the storefront renders only the selected rows.
// Subfolders define categories (e.g. a file in `spec-sheets/` → "Spec Sheets");
// top-level files land in "General".
//
// Matches the demo's three-section layout 1:1 (Resource Center Desktop.html /
// Mobile.html) and reuses the existing site design-system primitives in
// app/globals.css (.container, .section, .h-row, .cat-tile/.cat-head/.cat-foot,
// .shop-shell, .plp-toolbar, .facet/.facet-h, .tbl, .chip, .badge,
// .btn/.btn-ghost/.btn-sm/.btn-block).
// ─────────────────────────────────────────────────────────────────────────────

type Format = "PDF" | "ZIP" | "DWG" | "XLS" | "DOC" | "Other";
type Sort = "az" | "za";

interface Category {
  name: string;
  id: string;
}

// The flat shape the UI renders. `path` is either a WebDAV path relative to
// /content/file-search/ (e.g. "spec-sheets/foo.pdf") or a full pasted URL —
// bcContentUrl() resolves both.
interface FileRow {
  name: string;
  category: string;
  format: Format;
  path: string;
}

interface HelpBlock {
  show?: boolean;
  title?: string;
  body?: string;
  ctaLabel?: string;
  phoneNumber?: string;
  emailLabel?: string;
  email?: string;
}

interface FileSearchProps {
  className?: string;

  // Inline RichText — top-level only (can't be nested in List/Shape/Group).
  eyebrow?: ReactNode;
  heading?: ReactNode;
  intro?: ReactNode;

  // Top "Browse by type" section copy
  tilesEyebrow?: ReactNode;
  tilesHeading?: ReactNode;

  // WebDAV folder the admin is working in (dropdown). Sets the default category
  // for selected files that don't carry their own subfolder.
  folder?: FolderRef;

  // Admin-curated files added in the Makeswift panel. Each picks a WebDAV file
  // from a dropdown (or pastes a URL). This is the ONLY file source.
  files?: FileEntry[];

  // Sidebar help block (panel-only, single instance → Popover group)
  help?: HelpBlock;

  // Layout toggles
  layout?: {
    showFacets?: boolean;
  };
}

const FORMAT_LABEL: Record<Format, string> = {
  PDF: "PDF",
  ZIP: "ZIP",
  DWG: "DWG",
  XLS: "XLS",
  DOC: "DOC",
  Other: "FILE",
};

// Map a file extension (lowercased, no dot) to the `Format` enum the UI
// understands. Anything we don't recognize falls into "Other" → badge "FILE".
const EXT_TO_FORMAT: Record<string, Format> = {
  pdf: "PDF",
  zip: "ZIP",
  rar: "ZIP",
  "7z": "ZIP",
  tar: "ZIP",
  gz: "ZIP",
  dwg: "DWG",
  dxf: "DWG",
  xls: "XLS",
  xlsx: "XLS",
  csv: "XLS",
  doc: "DOC",
  docx: "DOC",
};

// Words that should render in ALL CAPS after titleization — covers the most
// common acronyms shown in a B2B Resource Center. Order doesn't matter.
const ALLCAPS = new Set([
  "pdf",
  "zip",
  "dwg",
  "dxf",
  "xls",
  "xlsx",
  "csv",
  "doc",
  "docx",
  "cad",
  "sku",
  "ies",
  "led",
  "ul",
  "ada",
  "rohs",
  "ce",
  "fcc",
]);

// Lowercase + dash-slug a category name so two files with "Spec & Cut Sheets"
// and "spec & cut sheets" collapse onto the same tile / facet pill.
function slugCat(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleize(input: string): string {
  const clean = input.replace(/[_-]+/g, " ").trim();
  if (!clean) return "";
  return clean
    .split(/\s+/)
    .map((w) =>
      ALLCAPS.has(w.toLowerCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    )
    .join(" ");
}

function formatFromExt(name: string): Format {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "Other";
  const ext = name.slice(dot + 1).toLowerCase();
  return EXT_TO_FORMAT[ext] ?? "Other";
}

function nameFromFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  return titleize(stem) || name;
}

function categoryFromFolder(folder: string): string {
  if (!folder) return "General";
  // Only the top-level segment becomes the category; deeper nesting flattens.
  const top = folder.split("/").filter(Boolean)[0] ?? "";
  return titleize(top) || "General";
}

// ── Makeswift Combobox values ───────────────────────────────────────────────
// Plain JSON objects (Makeswift's `Data` constraint), mirroring header-nav's
// CategoryRef. These MUST be `type` aliases, not interfaces — only object-type
// aliases satisfy Makeswift's `{ [key: string]: Data }` index signature, which
// lets Combobox infer the value generic instead of falling back to bare `Data`.
// A file picked from the WebDAV dropdown:
type FileRef = {
  path: string; // relative to /content/file-search/, e.g. "spec-sheets/foo.pdf"
  name: string; // bare filename, e.g. "foo.pdf"
  folder: string; // subfolder, "" for top-level
};

// A folder picked from the WebDAV dropdown.
type FolderRef = {
  path: string; // subfolder path; "" = root / General
};

// One row in the Makeswift "Files" list. `file` comes from the dropdown; `url`
// is an optional fallback for external links / files not yet in WebDAV.
interface FileEntry {
  file?: FileRef;
  url?: string;
  name?: string;
  category?: string;
  format?: Format | "auto";
}

// Map an admin-authored row to the flat FileRow the UI renders. Returns null
// for empty rows (neither a picked file nor a pasted URL). `folderDefault` is
// the top-level folder picker's path, used as the category when the row's file
// carries no subfolder of its own.
function entryToFileRow(item: FileEntry, folderDefault: string): FileRow | null {
  const ref = item.file;
  const path = (ref?.path ?? "").trim() || (item.url ?? "").trim();
  if (!path) return null;

  const refName = (ref?.name ?? "").trim();
  const basename = path.split(/[/\\]/).filter(Boolean).pop() ?? path;
  const name =
    (item.name ?? "").trim() || nameFromFilename(refName || basename) || "Document";

  const refFolder = (ref?.folder ?? "").trim();
  const category =
    (item.category ?? "").trim() || categoryFromFolder(refFolder || folderDefault);

  const fmtBasis = refName || basename;
  const format =
    !item.format || item.format === "auto" ? formatFromExt(fmtBasis) : item.format;

  return { name, category, format, path };
}

// ── Edit-time Combobox option loaders ───────────────────────────────────────
// These run in the Makeswift builder iframe against the storefront WebDAV
// routes — the same pattern as header-nav's categoryOptions. They are NOT used
// at render; the storefront shows only the selected rows.

// Subfolders under /content/file-search/, for the top-level "WebDAV folder"
// picker. A leading "All folders" option maps to root ("").
async function folderOptions(query: string) {
  const opts: { id: string; label: string; value: FolderRef }[] = [
    { id: "__root__", label: "All folders (General)", value: { path: "" } },
  ];
  try {
    const res = await fetch("/api/bc/webdav/folders");
    const json = await res.json();
    if (json?.ok && json.configured) {
      for (const path of json.folders as string[]) {
        opts.push({ id: path, label: titleize(path), value: { path } });
      }
    }
  } catch {
    // Network/parse failure → just the root option.
  }
  const q = query.trim().toLowerCase();
  return q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
}

// Every file in BC WebDAV, folder-prefixed, for the per-row "File" picker.
async function fileOptions(query: string) {
  const opts: { id: string; label: string; value: FileRef }[] = [];
  try {
    const res = await fetch("/api/bc/webdav/files");
    const json = await res.json();
    if (json?.ok && json.configured) {
      for (const f of json.files as {
        path: string;
        name: string;
        folder: string;
      }[]) {
        const label = f.folder ? `${titleize(f.folder)} › ${f.name}` : f.name;
        opts.push({
          id: f.path,
          label,
          value: { path: f.path, name: f.name, folder: f.folder },
        });
      }
    }
  } catch {
    // Network/parse failure → empty dropdown.
  }
  const q = query.trim().toLowerCase();
  return q ? opts.filter((o) => o.label.toLowerCase().includes(q)) : opts;
}

function FileSearch({
  className,
  eyebrow,
  heading,
  intro,
  tilesEyebrow,
  tilesHeading,
  folder,
  files,
  help,
  layout,
}: FileSearchProps) {
  const folderDefault = (folder?.path ?? "").trim();

  // The library is exactly the admin-selected rows — no runtime WebDAV fetch.
  // De-duplicate by resolved href so a dropdown pick and a matching URL
  // fallback don't render twice.
  const items = useMemo<FileRow[]>(() => {
    const seen = new Set<string>();
    const out: FileRow[] = [];
    for (const entry of files ?? []) {
      const row = entryToFileRow(entry, folderDefault);
      if (!row) continue;
      const key = (bcContentUrl(row.path) || row.path).trim().toLowerCase();
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      out.push(row);
    }
    return out;
  }, [files, folderDefault]);

  // Categories are derived from the files list. First-seen order is preserved
  // so the panel's row order drives the tile layout.
  const cats = useMemo<Category[]>(() => {
    const seen = new Map<string, string>(); // id → original name
    for (const f of items) {
      const name = f.category.trim();
      if (!name) continue;
      const id = slugCat(name);
      if (!id || seen.has(id)) continue;
      seen.set(id, name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  const catLabel = useMemo(
    () => Object.fromEntries(cats.map((c) => [c.id, c.name])),
    [cats],
  );

  // ── Counts ──────────────────────────────────────────────────────────────
  const catCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cats) m.set(c.id, 0);
    for (const f of items) {
      const key = slugCat(f.category);
      if (key && m.has(key)) m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [cats, items]);

  const fmtCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of items) {
      m.set(f.format, (m.get(f.format) ?? 0) + 1);
    }
    return m;
  }, [items]);

  const visibleCats = useMemo(
    () => cats.filter((c) => (catCounts.get(c.id) ?? 0) > 0),
    [cats, catCounts],
  );

  // ── Filter state ────────────────────────────────────────────────────────
  const [cat, setCat] = useState<string>("all");
  const [fmt, setFmt] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("az");

  const filtered = useMemo(() => {
    let list = items.filter((d) => {
      if (cat !== "all" && slugCat(d.category) !== cat) return false;
      if (fmt !== "all" && d.format !== fmt) return false;
      return true;
    });
    list = [...list].sort((a, b) =>
      sort === "az"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    );
    return list;
  }, [items, cat, fmt, sort]);

  // ── Responsive — match the testimonial-widget matchMedia pattern ────────
  const [mobile, setMobile] = useState(false);
  const [tablet, setTablet] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqMobile = window.matchMedia("(max-width: 767px)");
    const mqTablet = window.matchMedia("(max-width: 900px)");
    const u1 = () => setMobile(mqMobile.matches);
    const u2 = () => setTablet(mqTablet.matches);
    u1();
    u2();
    mqMobile.addEventListener("change", u1);
    mqTablet.addEventListener("change", u2);
    return () => {
      mqMobile.removeEventListener("change", u1);
      mqTablet.removeEventListener("change", u2);
    };
  }, []);

  const tileCols = mobile ? 2 : tablet ? 3 : 4;
  const showFacets = layout?.showFacets ?? true;

  const helpShow = help?.show ?? true;
  const helpTitle = help?.title?.trim() || "Need something specific?";
  const helpBody =
    help?.body?.trim() ||
    "Your rep can assemble a custom submittal pack to your fixture schedule.";
  const helpCtaLabel = help?.ctaLabel?.trim() || "Call our team";
  const helpPhone = help?.phoneNumber?.trim() || "";
  const helpEmailLabel = help?.emailLabel?.trim() || "Email support";
  const helpEmail = help?.email?.trim() || "";

  // ── Empty state ─────────────────────────────────────────────────────────
  // The library is fully admin-curated, so "empty" simply means no files were
  // added in the panel. Dev sees the curation hint; prod sees neutral copy.
  const noItems = items.length === 0;
  const isDev = process.env.NODE_ENV !== "production";
  const emptyMessage = isDev
    ? "No files yet. In the Makeswift panel, pick a WebDAV folder and add File rows (each row picks a file from the dropdown)."
    : "Resource library is being configured.";

  return (
    <div className={className ?? ""}>
      <style>{FS_CSS}</style>

      {/* ── Block 1: Header band ────────────────────────────────────────── */}
      <section className="fs-hero">
        <div className="container">
          <div className="fs-hero-inner">
            <div className="eyebrow fs-hero-eyebrow">{eyebrow}</div>
            <h1 className="fs-hero-h1">{heading}</h1>
            <p className="fs-hero-intro">{intro}</p>
          </div>
        </div>
      </section>

      {/* ── Block 2: Category tiles ─────────────────────────────────────── */}
      <section className="section fs-cats">
        <div className="container">
          <div className="h-row">
            <div>
              <div className="eyebrow">{tilesEyebrow}</div>
              <h2>{tilesHeading}</h2>
            </div>
            {cat !== "all" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setCat("all")}
              >
                <Icon name="x" size={12} /> Clear filter
              </button>
            )}
          </div>
          {visibleCats.length === 0 ? (
            <div className="fs-empty fs-empty--tiles">{emptyMessage}</div>
          ) : (
            <div
              className="fs-tile-grid"
              style={{ gridTemplateColumns: `repeat(${tileCols}, 1fr)` }}
            >
              {visibleCats.map((c) => {
                const active = cat === c.id;
                const count = catCounts.get(c.id) ?? 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className="cat-tile fs-cat-tile"
                    aria-pressed={active}
                    onClick={() => {
                      setCat(active ? "all" : c.id);
                      setFmt("all");
                    }}
                    style={{
                      borderColor: active ? "var(--ink)" : undefined,
                      boxShadow: active ? "inset 0 0 0 1px var(--ink)" : undefined,
                    }}
                  >
                    <div className="cat-head">
                      <h3 style={{ maxWidth: "100%" }}>{c.name}</h3>
                    </div>
                    <div className="cat-foot" style={{ marginTop: 0 }}>
                      <span>{count} {count === 1 ? "file" : "files"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Block 3: Document library ───────────────────────────────────── */}
      <section className="section fs-lib">
        <div className="container">
          <div className="shop-shell fs-shop-shell">
            {showFacets && (
              <aside className="fs-aside">
                <div className="eyebrow" style={{ marginBottom: 8 }}>FILTER LIBRARY</div>
                <div className="facet">
                  <div className="facet-h">Category</div>
                  <div className="fs-chip-row">
                    <PillButton
                      label="All"
                      count={items.length}
                      active={cat === "all"}
                      onClick={() => setCat("all")}
                    />
                    {visibleCats.map((c) => (
                      <PillButton
                        key={c.id}
                        label={c.name}
                        count={catCounts.get(c.id) ?? 0}
                        active={cat === c.id}
                        onClick={() => setCat(c.id)}
                      />
                    ))}
                  </div>
                </div>
                <div className="facet">
                  <div className="facet-h">Type</div>
                  <div className="fs-chip-row">
                    <PillButton
                      label="All"
                      count={items.length}
                      active={fmt === "all"}
                      onClick={() => setFmt("all")}
                    />
                    {Array.from(fmtCounts.entries()).map(([f, n]) => (
                      <PillButton
                        key={f}
                        label={FORMAT_LABEL[f as Format] ?? f}
                        count={n}
                        active={fmt === f}
                        onClick={() => setFmt(f)}
                      />
                    ))}
                  </div>
                </div>
                {helpShow && (
                  <div className="facet">
                    <div className="facet-h">{helpTitle}</div>
                    <p className="fs-help-body">{helpBody}</p>
                    <a
                      href={helpPhone ? `tel:${helpPhone.replace(/[^0-9+]/g, "")}` : "#"}
                      className="btn btn-ghost btn-sm btn-block"
                      style={{ textDecoration: "none" }}
                    >
                      <Icon name="headset" size={13} /> {helpCtaLabel}
                    </a>
                    {helpEmail && (
                      <a
                        href={`mailto:${helpEmail}`}
                        className="btn btn-ghost btn-sm btn-block"
                        style={{ textDecoration: "none", marginTop: 8 }}
                      >
                        <Icon name="mail" size={13} /> {helpEmailLabel}
                      </a>
                    )}
                  </div>
                )}
              </aside>
            )}

            <div className="fs-main">
              <div className="plp-toolbar fs-toolbar">
                <div className="left">
                  <span>
                    <b style={{ color: "var(--ink)" }}>{filtered.length}</b>{" "}
                    document{filtered.length === 1 ? "" : "s"}
                  </span>
                  {cat !== "all" && (
                    <span className="chip">
                      {catLabel[cat] ?? cat}
                      <button type="button" onClick={() => setCat("all")} aria-label="Clear category">×</button>
                    </span>
                  )}
                  {fmt !== "all" && (
                    <span className="chip">
                      {FORMAT_LABEL[fmt as Format] ?? fmt}
                      <button type="button" onClick={() => setFmt("all")} aria-label="Clear type">×</button>
                    </span>
                  )}
                </div>
                <div className="right">
                  <span className="muted" style={{ fontSize: 12 }}>Sort</span>
                  <select
                    className="fs-sort-select"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as Sort)}
                    aria-label="Sort documents"
                  >
                    <option value="az">Name A–Z</option>
                    <option value="za">Name Z–A</option>
                  </select>
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="card fs-empty-card">
                  <div className="mono" style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>
                    {noItems ? "NOTHING TO SHOW" : "NO MATCHES"}
                  </div>
                  <p style={{ margin: "0 0 16px", color: "var(--ink-2)" }}>
                    {noItems ? emptyMessage : "No documents match those filters."}
                  </p>
                  {!noItems && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setCat("all"); setFmt("all"); }}
                    >
                      Reset filters
                    </button>
                  )}
                </div>
              ) : mobile ? (
                <div className="card fs-list-card">
                  {filtered.map((d, i) => {
                    const href = bcContentUrl(d.path);
                    const isExternal = /^https?:/i.test(href);
                    return (
                      <a
                        key={`${d.name}-${i}`}
                        href={href || "#"}
                        className="fs-list-row"
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        download={href && !isExternal ? "" : undefined}
                      >
                        <span className="fs-list-icon" aria-hidden="true">
                          <Icon name="doc" size={18} />
                        </span>
                        <div className="fs-list-body">
                          <div className="fs-list-meta-top">
                            <span className="badge">{FORMAT_LABEL[d.format] ?? d.format}</span>
                          </div>
                          <div className="fs-list-name">{d.name || "Untitled"}</div>
                          <div className="mono fs-list-cat">{catLabel[slugCat(d.category)] ?? d.category}</div>
                        </div>
                        <span className="fs-list-dl" aria-hidden="true">
                          <Icon name="download" size={18} />
                        </span>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <div className="card fs-table-card">
                  <table className="tbl fs-tbl">
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th style={{ width: 90 }}>Type</th>
                        <th style={{ width: 220 }}>Category</th>
                        <th style={{ width: 110 }} aria-label="Download" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((d, i) => {
                        const href = bcContentUrl(d.path);
                        const isExternal = /^https?:/i.test(href);
                        const linkProps = href
                          ? {
                              href,
                              target: isExternal ? "_blank" : undefined,
                              rel: isExternal ? "noopener noreferrer" : undefined,
                              ...(isExternal ? {} : { download: "" as const }),
                            }
                          : { href: "#", "aria-disabled": true as const };
                        return (
                          <tr key={`${d.name}-${i}`}>
                            <td style={{ maxWidth: 460 }}>
                              <div className="fs-doc-cell">
                                <span className="fs-doc-icon" aria-hidden="true">
                                  <Icon name="doc" size={16} />
                                </span>
                                <div>
                                  <a {...linkProps} className="row-link fs-doc-name">
                                    {d.name || "Untitled"}
                                  </a>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="badge">{FORMAT_LABEL[d.format] ?? d.format}</span>
                            </td>
                            <td className="muted" style={{ fontSize: 12 }}>
                              {catLabel[slugCat(d.category)] ?? d.category}
                            </td>
                            <td>
                              <a {...linkProps} className="btn btn-ghost btn-sm">
                                <Icon name="download" size={13} /> Get
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Small subcomponents ─────────────────────────────────────────────────────

function PillButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fs-pill"
      aria-pressed={active}
      style={{
        background: active ? "var(--primary)" : "var(--surface)",
        borderColor: active ? "var(--primary)" : "var(--line-2)",
        color: active ? "#fff" : "var(--ink-2)",
      }}
    >
      {label}
      <span
        className="mono"
        style={{ fontSize: 10.5, color: active ? "rgba(255,255,255,.7)" : "var(--muted)" }}
      >
        {count}
      </span>
    </button>
  );
}

// ── Co-located styles (scoped under .fs-*) ─────────────────────────────────

const FS_CSS = `
/* Hero band — mirrors the design's <section style="background: surface;
   border-bottom: 1px solid line"> with the inner 720px column. */
.fs-hero { background: var(--surface); border-bottom: 1px solid var(--line); }
.fs-hero .container { padding-top: 40px; padding-bottom: 40px; }
.fs-hero-inner { max-width: 720px; }
.fs-hero-eyebrow { margin-bottom: 14px; }
.fs-hero-eyebrow:empty { display: none; }
.fs-hero-h1 {
  font-family: var(--font-display); font-size: 44px; font-weight: 600;
  letter-spacing: -.025em; line-height: 1.05; margin: 0; max-width: 14ch;
  color: var(--ink);
}
.fs-hero-h1:empty { display: none; }
.fs-hero-intro {
  color: var(--muted); font-size: 15px; line-height: 1.55;
  margin: 16px 0 0; max-width: 52ch;
}
.fs-hero-intro:empty { display: none; }

/* Category tiles section. The .cat-tile class already exists in globals.css
   with aspect-ratio 1.1/1 — we override per the demo to gap:18, padding:20,
   justify-content:flex-start, aspect-ratio:auto so the tile is just name +
   "X files" with breathing room. */
.fs-tile-grid { display: grid; gap: var(--gutter, 24px); }
.fs-cat-tile {
  aspect-ratio: auto !important;
  justify-content: flex-start !important;
  gap: 18px !important;
  padding: 20px !important;
  text-align: left;
  cursor: pointer;
  font: inherit;
  color: var(--ink);
  transition: border-color .12s, box-shadow .12s;
}
.fs-cat-tile:hover { border-color: var(--ink-2); }
.fs-cat-tile .cat-head h3 { font-size: 15px; }
.fs-cat-tile .cat-foot {
  font-family: var(--font-geist-mono, monospace);
  font-size: 11px; color: var(--muted); letter-spacing: .04em;
}

/* Library section — shop-shell already collapses to 1-col at ≤900px per
   globals.css. We additionally force a wider sidebar at desktop and hide it
   gracefully when showFacets is off. */
.fs-shop-shell { padding: 0 !important; min-height: 0 !important; }
.fs-aside { display: flex; flex-direction: column; }
.fs-aside .facet:first-of-type { padding-top: 0; }

.fs-chip-row { display: flex; flex-wrap: wrap; gap: 6px; }
.fs-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 999px;
  font-size: 12px; font-weight: 500; line-height: 1;
  border: 1px solid var(--line-2); background: var(--surface);
  color: var(--ink-2); font-family: inherit;
  cursor: pointer; transition: background .12s, border-color .12s, color .12s;
}
.fs-pill:hover { border-color: var(--ink-2); }

.fs-help-body { font-size: 12px; color: var(--muted); line-height: 1.5; margin: 0 0 12px; }

/* Toolbar above the table. .plp-toolbar lives in globals.css already; we
   tighten its spacing here since the library section already has section
   padding around it. */
.fs-toolbar { margin-bottom: 16px !important; padding-top: 0 !important; }
.fs-toolbar .left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--muted); }
.fs-toolbar .right { display: inline-flex; align-items: center; gap: 8px; }
.fs-sort-select {
  height: 32px; font-size: 12px; width: 150px;
  border: 1px solid var(--line-2); border-radius: var(--radius);
  background: var(--surface); color: var(--ink); padding: 0 10px;
  font-family: inherit;
}

/* Table styling — base .tbl from globals.css. Slight tweaks for vertical
   rhythm + the doc cell's 2-line layout (name + attribution/meta). */
.fs-tbl th, .fs-tbl td { padding: 14px 16px; }
.fs-doc-cell { display: flex; gap: 12px; align-items: center; min-width: 0; }
.fs-doc-icon { color: var(--muted); flex-shrink: 0; }
.fs-doc-name { font-weight: 500; }

/* Mobile card-list — table swaps to this at ≤767px (driven by JS), matching
   the demo's Mobile screen. */
.fs-list-card { padding: 0; overflow: hidden; }
.fs-list-row {
  display: grid; grid-template-columns: auto 1fr auto;
  gap: 12px; padding: 14px; border-bottom: 1px solid var(--line);
  align-items: center; text-decoration: none; color: inherit;
}
.fs-list-card .fs-list-row:last-child { border-bottom: 0; }
.fs-list-icon { color: var(--muted); display: inline-flex; }
.fs-list-body { min-width: 0; }
.fs-list-meta-top { display: flex; align-items: center; gap: 6px; }
.fs-list-name { font-size: 13px; font-weight: 600; line-height: 1.3; margin: 5px 0 3px; color: var(--ink); }
.fs-list-cat { font-size: 10.5px; color: var(--muted); }
.fs-list-dl { color: var(--primary); display: inline-flex; }

.fs-empty {
  padding: 48px 24px; text-align: center; color: var(--muted); font-size: 13px;
  background: var(--bg-alt); border-radius: var(--radius-card);
  border: 1px dashed var(--line-2);
}
.fs-empty-card { padding: 56px !important; text-align: center; }

/* Library section background — design uses var(--surface) for the library
   band and a 1px top border. */
.fs-lib { background: var(--surface); border-top: 1px solid var(--line); }

@media (max-width: 900px) {
  .fs-hero .container { padding-top: 32px; padding-bottom: 32px; }
  .fs-hero-h1 { font-size: 34px; max-width: none; }
  .fs-hero-intro { font-size: 14px; }
}
@media (max-width: 767px) {
  .fs-hero .container { padding-top: 24px; padding-bottom: 24px; }
  .fs-hero-h1 { font-size: 28px; letter-spacing: -.02em; }
  .fs-hero-intro { font-size: 13px; }

  /* Sidebar stacks above the table on mobile via globals.css .shop-shell rule.
     Tighten its facets and hide the sort dropdown (use chips above). */
  .fs-aside { padding-bottom: 4px; }
  .fs-toolbar .right { display: none; }

  .fs-cat-tile { padding: 14px !important; gap: 10px !important; }
  .fs-cat-tile .cat-head h3 { font-size: 13px; }
}
@media (max-width: 480px) {
  .fs-hero-h1 { font-size: 24px; }
}
`;

// ─── Registration ────────────────────────────────────────────────────────────

runtime.registerComponent(FileSearch, {
  type: "acme-file-search",
  label: "Products & Ordering / File Search",
  props: {
    className: Style(),

    // ── Inline RichText (top-level only) ───────────────────────────────────
    eyebrow: RichText({ mode: RichText.Mode.Inline, defaultValue: "RESOURCE CENTER" }),
    heading: RichText({
      mode: RichText.Mode.Inline,
      defaultValue: "Everything to spec, install, and get paid.",
    }),
    intro: RichText({
      mode: RichText.Mode.Inline,
      defaultValue:
        "Spec sheets, install guides, code docs, CAD packs, and rebate paperwork — for every line we stock. Built for the jobsite and the submittal.",
    }),

    tilesEyebrow: RichText({ mode: RichText.Mode.Inline, defaultValue: "BROWSE BY TYPE" }),
    tilesHeading: RichText({ mode: RichText.Mode.Inline, defaultValue: "Resource categories" }),

    // ── WebDAV folder (dropdown of subfolders under /content/file-search/) ──
    // Picked from /api/bc/webdav/folders so the admin never types a path. Sets
    // the default category for selected files that have no subfolder of their
    // own. Leave on "All folders" to default everything to "General".
    folder: Combobox({ label: "WebDAV folder", getOptions: folderOptions }),

    // ── Files (admin-curated) ──────────────────────────────────────────────
    // The ONLY file source — there is no runtime auto-listing. Each row's
    // "File" control is a searchable dropdown of the files in BC WebDAV
    // (/api/bc/webdav/files), so admins pick instead of typing. The optional
    // URL is a fallback for external links / files not yet uploaded.
    files: List({
      label: "Files",
      type: Shape({
        type: {
          file: Combobox({ label: "File (pick from WebDAV)", getOptions: fileOptions }),
          url: TextInput({
            label: "Or paste a URL (external / not in WebDAV)",
            defaultValue: "",
          }),
          name: TextInput({
            label: "Name override (blank = derive from filename)",
            defaultValue: "",
          }),
          category: TextInput({
            label: "Category override (blank = from folder)",
            defaultValue: "",
          }),
          format: Select({
            label: "Format badge",
            options: [
              { label: "Auto (from extension)", value: "auto" },
              { label: "PDF", value: "PDF" },
              { label: "ZIP (archive)", value: "ZIP" },
              { label: "DWG (CAD)", value: "DWG" },
              { label: "XLS (spreadsheet)", value: "XLS" },
              { label: "DOC", value: "DOC" },
              { label: "Other", value: "Other" },
            ],
            defaultValue: "auto",
          }),
        },
      }),
      getItemLabel: (item) =>
        (item?.name ?? "").trim() ||
        ((item?.file as FileRef | undefined)?.name ?? "").trim() ||
        (item?.url ?? "").trim() ||
        "Document",
    }),

    // ── Help block (single instance → Popover group) ───────────────────────
    help: Group({
      label: "Help block",
      preferredLayout: Group.Layout.Popover,
      props: {
        show: Checkbox({ label: "Show help block in sidebar", defaultValue: true }),
        title: TextInput({ label: "Title", defaultValue: "Need something specific?" }),
        body: TextArea({
          label: "Body copy",
          defaultValue:
            "Your rep can assemble a custom submittal pack to your fixture schedule.",
        }),
        ctaLabel: TextInput({ label: "Call button label", defaultValue: "Call our team" }),
        phoneNumber: TextInput({
          label: "Phone number (tel: link; leave blank to fall back to #)",
          defaultValue: "(800) 555-0182",
        }),
        emailLabel: TextInput({ label: "Email button label", defaultValue: "Email support" }),
        email: TextInput({
          label: "Support email (mailto: link; blank = hide email button)",
          defaultValue: "",
        }),
      },
    }),

    // ── Layout (single instance → Popover group) ───────────────────────────
    layout: Group({
      label: "Layout",
      preferredLayout: Group.Layout.Popover,
      props: {
        showFacets: Checkbox({ label: "Show sidebar facets", defaultValue: true }),
      },
    }),
  },
});

export default FileSearch;
