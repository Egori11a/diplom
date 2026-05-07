import { SetMetadata } from "@nestjs/common";
import type { AdminRole } from "./admin-role";

export const ROLES_METADATA_KEY = "roles";

export const Roles = (...roles: AdminRole[]) => SetMetadata(ROLES_METADATA_KEY, roles);
