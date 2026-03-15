import type { EditingGroup } from "../../../../pages/admin-page/types";

export interface GroupDrawerOrganismProps {
  group: EditingGroup;
  linkedToggleKeys: string[];
  memberInput: string;
  isBusy: boolean;
  onClose: () => void;
  onGroupChange: (group: EditingGroup) => void;
  onMemberInputChange: (value: string) => void;
  onAddMember: () => void;
  onRemoveMember: (memberKey: string) => void;
  onSave: () => void;
}
