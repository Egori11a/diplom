import type { AdminRole, AdminUserView } from "../../../../shared/api";
import type { CreateAdminForm } from "../../../../pages/admin-page/types";

export interface UsersOrganismProps {
  users: AdminUserView[];
  currentAdminEmail: string;
  createAdminForm: CreateAdminForm;
  isBusy: boolean;
  errorMessage: string;
  onCreateAdminFormChange: (patch: Partial<CreateAdminForm>) => void;
  onCreateAdmin: () => void;
  onRoleChange: (userId: string, role: AdminRole) => void;
  onResetPassword: (user: AdminUserView) => void;
  onToggleActive: (user: AdminUserView) => void;
}
