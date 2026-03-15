import type { GroupMember, GroupView } from "../../shared/api";

export interface ToggleForm {
  id?: string;
  appId: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  rolloutPercent: number;
  groupNames: string[];
  includeIdsRaw: string;
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

export interface GroupMemberInputMap {
  [groupId: string]: string;
}

export interface ToggleDraftSource {
  id?: string;
  appId: string;
  key: string;
  name: string;
  featureKey: string;
  featureEnabled: boolean;
  rolloutPercent?: number;
  groupNames?: string[];
  includeIds?: string[];
}

export interface TogglePayloadContext {
  groups: GroupView[];
}
