import type { BadgeKind, StatusKind } from "@/types";

const BADGE_LABELS: Record<BadgeKind, string> = {
  new: "New",
  best: "Best Seller",
  bulk: "Bulk Discount",
  ship: "Quick Ship",
  sale: "On Sale",
  low: "Low Stock",
};

interface BadgeProps {
  kind: BadgeKind;
  children?: React.ReactNode;
}

export function Badge({ kind, children }: BadgeProps) {
  return (
    <span className={`badge badge-${kind}`}>
      {children ?? BADGE_LABELS[kind]}
    </span>
  );
}

interface StatusProps {
  kind: StatusKind;
  children: React.ReactNode;
}

export function Status({ kind, children }: StatusProps) {
  return <span className={`status status-${kind}`}>{children}</span>;
}

type RolePillRole = "admin" | "buyer" | "approver" | "viewer";
const ROLE_LABELS: Record<RolePillRole, string> = {
  admin: "Admin",
  buyer: "Buyer",
  approver: "Approver",
  viewer: "Viewer",
};

export function RolePill({ role }: { role: RolePillRole }) {
  return <span className={`rolepill rolepill-${role}`}>{ROLE_LABELS[role]}</span>;
}

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const cls = size === "sm" ? "av av-sm" : size === "lg" ? "av av-lg" : "av";
  return <span className={cls}>{initials}</span>;
}
