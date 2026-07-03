import type { StatusKind } from "@/types";

export interface UrgencyInfo {
  label: string;
  cls: StatusKind;
  /** Whole days until due (negative when overdue). */
  days: number;
  overdue: boolean;
}

/**
 * Shared due-date urgency, used by both invoices and quotes so the two stay
 * visually consistent. Returns null when there's no due date.
 *   settled  → muted "Settled"
 *   past due → err   "Overdue Nd"
 *   ≤ soonDays → warn "Due in Nd" / "Due today"
 *   else     → muted "Due in Nd"
 */
export function urgencyInfo(
  dueDate: string | null | undefined,
  opts?: { settled?: boolean; soonDays?: number },
): UrgencyInfo | null {
  if (!dueDate) return null;
  const due = new Date(dueDate).getTime();
  if (Number.isNaN(due)) return null;

  const days = Math.ceil((due - Date.now()) / 86_400_000);
  const soon = opts?.soonDays ?? 7;

  if (opts?.settled) return { label: "Settled", cls: "muted", days, overdue: false };
  if (days < 0) return { label: `Overdue ${Math.abs(days)}d`, cls: "err", days, overdue: true };
  if (days === 0) return { label: "Due today", cls: "warn", days, overdue: false };
  if (days <= soon) return { label: `Due in ${days}d`, cls: "warn", days, overdue: false };
  return { label: `Due in ${days}d`, cls: "muted", days, overdue: false };
}

export function UrgencyPill({
  dueDate,
  settled,
  soonDays,
}: {
  dueDate: string | null | undefined;
  settled?: boolean;
  soonDays?: number;
}) {
  const info = urgencyInfo(dueDate, { settled, soonDays });
  if (!info) return null;
  return <span className={`status status-${info.cls}`}>{info.label}</span>;
}
