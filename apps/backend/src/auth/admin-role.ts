export const ADMIN_ROLES = ["owner", "admin", "editor", "viewer"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];
