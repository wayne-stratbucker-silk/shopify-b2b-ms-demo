"use client";

import { useState, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared client-side sorting/formatting primitives (ported from the BC Catalyst
// accelerator so the account tables render identically). Client sub-pages that
// own their rows (invoices, quotes, orders) use useTableSort + SortHeader +
// sortRows; DeadlinePill/formatMoney/formatDate are the shared cell renderers.
// The declarative <SortableTable> below stays for server-rendered callers.
// ─────────────────────────────────────────────────────────────────────────────

export type SortDir = "asc" | "desc";

export function useTableSort<K extends string>(initialCol: K, initialDir: SortDir = "asc") {
  const [sortCol, setSortCol] = useState<K>(initialCol);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);
  function toggleSort(col: K) {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortCol(col); setSortDir("asc"); }
  }
  return { sortCol, sortDir, toggleSort };
}

/** Pure, non-mutating sort. Numbers compare numerically; strings numeric-aware. */
export function sortRows<T>(
  rows: T[],
  accessor: (row: T) => string | number,
  dir: SortDir,
  tiebreak?: (row: T) => number,
): T[] {
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = accessor(a);
    const bv = accessor(b);
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    if (cmp === 0 && tiebreak) cmp = tiebreak(a) - tiebreak(b);
    return sign * cmp;
  });
}

interface SortHeaderProps<K extends string> {
  col: K;
  activeCol: K;
  dir: SortDir;
  onSort: (col: K) => void;
  className?: string;
  children: ReactNode;
}

export function SortHeader<K extends string>({ col, activeCol, dir, onSort, className, children }: SortHeaderProps<K>) {
  const active = activeCol === col;
  return (
    <th
      className={className}
      tabIndex={0}
      role="columnheader"
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      onClick={() => onSort(col)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSort(col); } }}
      style={{ cursor: "pointer", userSelect: "none" }}
    >
      {children}
      <span aria-hidden style={{ marginLeft: 4, fontSize: 10, opacity: active ? 1 : 0.35 }}>
        {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </th>
  );
}

export const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Format an epoch-ms timestamp as a short UTC date (SSR/CSR consistent). */
export function formatDate(ms: number): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  } catch { return "—"; }
}

/** Colored urgency pill for a deadline. `ts` is epoch-SECONDS. */
export function DeadlinePill({ ts }: { ts?: number }) {
  if (!ts) return <span className="muted">—</span>;
  const days = (ts * 1000 - Date.now()) / 86_400_000;
  const tone =
    days < 5
      ? { bg: "rgba(198,40,40,.12)", fg: "#c62828" }
      : days < 10
        ? { bg: "rgba(230,81,0,.12)", fg: "#e65100" }
        : { bg: "rgba(46,125,50,.12)", fg: "#2e7d32" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: tone.bg, color: tone.fg, whiteSpace: "nowrap" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone.fg, flexShrink: 0 }} />
      {formatDate(ts * 1000)}
    </span>
  );
}

export interface SortColumn {
  header: ReactNode;
  /** Class applied to the <th> (e.g. "col-hide" for responsive tables). */
  thClassName?: string;
  sortable?: boolean;
  /** Right-align numeric columns. */
  align?: "num";
}

export interface SortCell {
  content: ReactNode;
  /** Class applied to the <td> — preserve the col-* classes for tbl-mobile-cards. */
  className?: string;
  /** Value used for sorting this cell's column (defaults to no sort). */
  sortValue?: string | number;
}

export interface SortRow {
  key: string;
  cells: SortCell[];
}

/**
 * Reusable client sortable table. The server parent pre-renders each cell's
 * `content` (links, pills, buttons) and supplies a primitive `sortValue`; the
 * client only reorders rows. Preserves per-cell classNames so existing
 * responsive (tbl-mobile-cards) layouts keep working.
 */
export function SortableTable({
  columns,
  rows,
  tableClassName = "tbl",
  initialSort,
}: {
  columns: SortColumn[];
  rows: SortRow[];
  tableClassName?: string;
  initialSort?: { index: number; dir: "asc" | "desc" };
}) {
  const [sort, setSort] = useState<{ index: number; dir: "asc" | "desc" } | null>(initialSort ?? null);

  let rendered = rows;
  if (sort && columns[sort.index]?.sortable) {
    rendered = [...rows].sort((a, b) => {
      const av = a.cells[sort.index]?.sortValue ?? "";
      const bv = b.cells[sort.index]?.sortValue ?? "";
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }

  function toggle(i: number) {
    setSort((s) => (s && s.index === i ? { index: i, dir: s.dir === "asc" ? "desc" : "asc" } : { index: i, dir: "asc" }));
  }

  return (
    <table className={tableClassName} style={{ width: "100%" }}>
      <thead>
        <tr>
          {columns.map((c, i) => {
            const active = sort?.index === i;
            const cls = [c.thClassName, c.align === "num" ? "num" : ""].filter(Boolean).join(" ");
            return (
              <th
                key={i}
                className={cls || undefined}
                aria-sort={active ? (sort!.dir === "asc" ? "ascending" : "descending") : undefined}
                style={c.sortable ? { cursor: "pointer", userSelect: "none" } : undefined}
                onClick={c.sortable ? () => toggle(i) : undefined}
              >
                {c.header}
                {c.sortable && (
                  <span aria-hidden="true" style={{ marginLeft: 4, opacity: active ? 0.9 : 0.3, fontSize: 10 }}>
                    {active ? (sort!.dir === "asc" ? "▲" : "▼") : "⇅"}
                  </span>
                )}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody>
        {rendered.map((r) => (
          <tr key={r.key}>
            {r.cells.map((cell, i) => (
              <td key={i} className={cell.className}>{cell.content}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
