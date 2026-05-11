import type { AdminRole } from "./admin-role";

export interface AuthenticatedAdmin {
  userId: string;
  email: string;
  role: AdminRole;
}
