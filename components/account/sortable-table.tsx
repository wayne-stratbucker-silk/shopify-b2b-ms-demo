"use client";

import { useState, type ReactNode } from "react";

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
