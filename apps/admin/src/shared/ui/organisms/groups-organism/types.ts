import type { GroupView } from "../../../api";
import type { EditingGroup } from "../../../../pages/admin-page/types";

export interface GroupsOrganismProps {
  groups: Array<GroupView & { linkedTogglesCount: number }>;
  searchQuery: string;
  newGroupName: string;
  newGroupDescription: string;
  isBusy: boolean;
  onSearchQueryChange: (value: string) => void;
  onNewGroupNameChange: (value: string) => void;
  onNewGroupDescriptionChange: (value: string) => void;
  onCreateGroup: () => void;
  onEditGroup: (group: EditingGroup) => void;
  onDeleteGroup: (groupId: string) => void;
}
