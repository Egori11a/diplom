import type { GroupView } from "../../../api";
import type { EditingGroup, GroupMemberInputMap } from "../../../../pages/admin-page/types";

export interface GroupsOrganismProps {
  groups: GroupView[];
  newGroupName: string;
  newGroupDescription: string;
  memberInputs: GroupMemberInputMap;
  onNewGroupNameChange: (value: string) => void;
  onNewGroupDescriptionChange: (value: string) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: EditingGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onMemberInputChange: (groupId: string, value: string) => void;
  onAddMember: (groupId: string) => void;
  onRemoveMember: (groupId: string, memberKey: string) => void;
}
