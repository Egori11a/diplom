import type { Dispatch, SetStateAction } from "react";
import type {
  AdminRole,
  AdminUserView,
  GroupMember,
  GroupView,
  ToggleView
} from "../../shared/api";

export interface ToggleFormVariant {
  key: string;
  weightPercent: number;
  comment?: string;
}

export interface ToggleForm {
  id?: string;
  appId: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  rolloutPercent: number;
  trafficPercent: number;
  groupNames: string[];
  includeIdsRaw: string;
  variants: ToggleFormVariant[];
}

export interface EditingGroup {
  id: string;
  name: string;
  description: string;
  initialName: string;
  members: GroupMember[];
}

export interface PendingDeleteGroup {
  id: string;
  name: string;
}

export interface AdminPageProps {
  initialEmail?: string;
  initialPassword?: string;
}

export type AdminScreen = "onboarding" | "groups" | "toggles" | "users";

export interface GroupMemberInputMap {
  [groupId: string]: string;
}

export interface GroupsQuery {
  groups: GroupView[];
}

export interface TogglesQuery {
  experiments: ToggleView[];
}

export interface UsersQuery {
  admins: AdminUserView[];
}

export interface CreateAdminForm {
  email: string;
  password: string;
  role: AdminRole;
}

export interface ResetPasswordTarget {
  id: string;
  email: string;
}

export interface GroupWithLinks extends GroupView {
  linkedTogglesCount: number;
}

export interface ToggleDraftSource {
  id?: string;
  appId: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  rolloutPercent?: number;
  trafficPercent?: number;
  groupNames?: string[];
  includeIds?: string[];
  variants?: ToggleFormVariant[];
}

export interface TogglePayloadContext {
  groups: GroupView[];
}

export interface UseAdminDataParams {
  token: string;
  currentAdminRole?: AdminRole;
  selectedToggleId?: string | null;
  newGroupName: string;
  newGroupDescription: string;
  setNewGroupName: Dispatch<SetStateAction<string>>;
  setNewGroupDescription: Dispatch<SetStateAction<string>>;
  memberInputs: GroupMemberInputMap;
  setMemberInputs: Dispatch<SetStateAction<GroupMemberInputMap>>;
  editingGroup: EditingGroup | null;
  setEditingGroup: Dispatch<SetStateAction<EditingGroup | null>>;
  setPendingDeleteGroup: Dispatch<SetStateAction<PendingDeleteGroup | null>>;
  toggleForm: ToggleForm;
  setToggleDrawerOpen: Dispatch<SetStateAction<boolean>>;
}

export interface UseAdminDerivedParams {
  groups: GroupView[];
  toggles: ToggleView[];
  groupSearchQuery: string;
  toggleSearchQuery: string;
  editingGroup: EditingGroup | null;
}
