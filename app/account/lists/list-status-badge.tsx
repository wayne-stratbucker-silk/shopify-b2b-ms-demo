// Small pill showing a shopping list's status. Shopify metaobject-backed lists
// have no approval workflow (unlike the BC B2B Edition source), so status is
// derived from item count: a list with items is "Active", an empty one is
// "Empty". Uses the shared design-system status classes so the badge matches
// every other account table. Pure/presentational — safe in both server and
// client components.

export type ListStatus = "active" | "empty";

const META: Record<ListStatus, { label: string; cls: string }> = {
  active: { label: "Active", cls: "ok" },
  empty: { label: "Empty", cls: "muted" },
};

export function listStatusFromItems(itemCount: number): ListStatus {
  return itemCount > 0 ? "active" : "empty";
}

export function ListStatusBadge({ status }: { status: ListStatus }) {
  const m = META[status] ?? META.empty;
  return <span className={`status status-${m.cls}`}>{m.label}</span>;
}
