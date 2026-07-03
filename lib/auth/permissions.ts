export type Permission =
  | "company.orders.view_all"
  | "company.orders.view_own"
  | "company.orders.create"
  | "company.quotes.view_all"
  | "company.quotes.view_own"
  | "company.quotes.approve"
  | "company.invoices.view"
  | "company.invoices.pay"
  | "company.users.manage"
  | "company.lists.view_all"
  | "company.lists.view_own"
  | "company.addresses.manage"
  | "company.settings.manage";

const BUYER_PERMISSIONS: Permission[] = [
  "company.orders.view_own",
  "company.orders.create",
  "company.quotes.view_own",
  "company.lists.view_own",
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...BUYER_PERMISSIONS,
  "company.orders.view_all",
  "company.quotes.view_all",
  "company.quotes.approve",
  "company.invoices.view",
  "company.invoices.pay",
  "company.users.manage",
  "company.lists.view_all",
  "company.addresses.manage",
  "company.settings.manage",
];

export function permissionsForRole(role: "admin" | "buyer"): Permission[] {
  return role === "admin" ? ADMIN_PERMISSIONS : BUYER_PERMISSIONS;
}

export function hasPermission(
  permissions: Permission[] | undefined,
  permission: Permission,
): boolean {
  if (!permissions) return false;
  return permissions.includes(permission);
}
