import type { EditingGroup } from "../../../../pages/admin-page/types";

export interface GroupDrawerOrganismProps {
  group: EditingGroup;
  onClose: () => void;
  onGroupChange: (group: EditingGroup) => void;
  onSave: () => void;
}
