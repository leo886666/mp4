export type Role = "user" | "creator" | "reviewer" | "admin" | "owner";

export const ROLE_RANK: Record<Role, number> = {
  user: 0,
  creator: 10,
  reviewer: 20,
  admin: 30,
  owner: 40,
};

export const ROLE_LABEL: Record<Role, string> = {
  user: "Viewer",
  creator: "Creator",
  reviewer: "Reviewer",
  admin: "Admin",
  owner: "Owner",
};

/** Fine-grained permissions — the console checks these, never raw roles. */
export type Permission =
  | "console.view"
  | "users.read"
  | "users.write"
  | "orders.read"
  | "orders.refund"
  | "content.read"
  | "content.write"
  | "review.decide"
  | "reports.handle"
  | "campaigns.write"
  | "payouts.write"
  | "settings.write"
  | "audit.read";

const REVIEWER: Permission[] = ["console.view", "content.read", "review.decide", "reports.handle", "users.read", "orders.read"];
const ADMIN: Permission[] = [
  ...REVIEWER,
  "users.write",
  "orders.refund",
  "content.write",
  "campaigns.write",
  "payouts.write",
  "audit.read",
];
const OWNER: Permission[] = [...ADMIN, "settings.write"];

export const PERMISSIONS: Record<Role, Permission[]> = {
  user: [],
  creator: [],
  reviewer: REVIEWER,
  admin: ADMIN,
  owner: OWNER,
};

export function can(role: Role | string | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[role as Role] ?? []).includes(perm);
}

export function atLeast(role: Role | string | undefined | null, min: Role): boolean {
  if (!role) return false;
  return (ROLE_RANK[role as Role] ?? -1) >= ROLE_RANK[min];
}

export const isStaff = (role?: string | null) => atLeast(role, "reviewer");
